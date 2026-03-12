import docker from "../docker/client.js";
import logger from "../utils/logger.js";
import ContainerOwnership from "../models/ContainerOwnership.js";
import ContainerMetric from "../models/containerMetric.model.js";
import { getRedisClient, isRedisConnected } from "../redis/client.js";
import Redis from "ioredis";

// Configuration
const CYCLE_INTERVAL_MS = 2_000;
const BATCH_CONCURRENCY = 50;
const BUFFER_SIZE = 60;
const PERSIST_EVERY_N = 15;
const RECONCILE_INTERVAL_MS = 30_000;
const MAX_TRACKED_CONTAINERS = 200_000;
const WS_BACKPRESSURE_BYTES = 1_000_000; // 1MB

// Redis Pub/Sub
const REDIS_CHANNEL = "devopsease:metrics";
const LEADER_KEY = "devopsease:metrics:leader";
const LEADER_TTL = 10; // seconds — leader lock expires if process dies
const LEADER_RENEW_MS = 5_000; // renew lock every 5s

class CircularBuffer {
    constructor(size) {
        this._size = size;
        this._buf = [];
    }
    push(item) {
        if (this._buf.length >= this._size) this._buf.shift();
        this._buf.push(item);
    }
    getAll() {
        return [...this._buf];
    }
    get length() {
        return this._buf.length;
    }
}

// Global Metrics Collector with Redis Pub/Sub for multi-process support.
// In cluster mode (PM2 -i N), only ONE process (the leader) polls Docker.
// The leader publishes data points to a Redis Pub/Sub channel.
// All workers (including leader) subscribe and update their local cache.
// If Redis is unavailable, falls back to single-process mode (every worker polls).

class GlobalMetricsCollector {
    constructor() {
        this._cache = new Map();
        this._runningIds = new Set();
        this._cycleTimer = null;
        this._reconcileTimer = null;
        this._leaderRenewTimer = null;
        this._running = false;
        this._isLeader = false;
        this._processId = `${process.pid}-${Date.now()}`;
        this._listeners = new Map();
        this._subscriber = null; // dedicated Redis connection for Pub/Sub

        // Cycle performance metrics
        this._lastCycleMs = 0;
        this._lastCycleTimestamp = 0;
    }

    // Lifecycle
    async start() {
        if (this._running) return;
        this._running = true;

        // Try to become leader and start Pub/Sub subscriber
        await this._initRedis();

        logger.info("GlobalMetricsCollector: starting", {
            pid: process.pid,
            isLeader: this._isLeader,
            redisAvailable: isRedisConnected(),
        });

        // Only the leader (or single-process fallback) polls Docker
        if (this._isLeader) {
            await this._startCollecting();
        }
    }

    async _startCollecting() {
        await this._reconcile();

        this._reconcileTimer = setInterval(() => {
            this._reconcile().catch((err) =>
                logger.warn("GlobalMetricsCollector: reconcile failed", { error: err.message }),
            );
        }, RECONCILE_INTERVAL_MS);

        this._cycleTimer = setInterval(() => {
            this._collectAll().catch((err) =>
                logger.warn("GlobalMetricsCollector: collection cycle failed", { error: err.message }),
            );
        }, CYCLE_INTERVAL_MS);

        this._collectAll().catch(() => { });
    }

    _stopCollecting() {
        if (this._cycleTimer) {
            clearInterval(this._cycleTimer);
            this._cycleTimer = null;
        }
        if (this._reconcileTimer) {
            clearInterval(this._reconcileTimer);
            this._reconcileTimer = null;
        }
    }

    stop() {
        this._running = false;
        this._stopCollecting();

        if (this._leaderRenewTimer) {
            clearInterval(this._leaderRenewTimer);
            this._leaderRenewTimer = null;
        }

        // Unsubscribe from Redis Pub/Sub
        if (this._subscriber) {
            this._subscriber.unsubscribe(REDIS_CHANNEL).catch(() => { });
            this._subscriber.quit().catch(() => { });
            this._subscriber = null;
        }

        // Release leader lock
        if (this._isLeader && isRedisConnected()) {
            const redis = getRedisClient();
            redis.del(LEADER_KEY).catch(() => { });
        }

        this._cache.clear();
        this._runningIds.clear();
        this._listeners.clear();
        this._isLeader = false;
        this._lastCycleMs = 0;
        this._lastCycleTimestamp = 0;

        logger.info("GlobalMetricsCollector: stopped");
    }

    // Restart — used by watchdog when collector stalls
    async restart() {
        logger.warn("GlobalMetricsCollector: restarting");
        this.stop();
        await this.start();
    }

    // Redis Pub/Sub initialization
    async _initRedis() {
        if (!isRedisConnected()) {
            // No Redis → single-process fallback (every worker is its own leader)
            this._isLeader = true;
            logger.info("GlobalMetricsCollector: Redis unavailable, running in single-process mode");
            return;
        }

        // Try to become leader via SETNX (atomic lock)
        await this._tryBecomeLeader();

        // Start Pub/Sub subscriber (all workers, including leader, subscribe)
        await this._startSubscriber();

        // Periodically renew leader lock or try to take over if leader died
        this._leaderRenewTimer = setInterval(() => {
            this._leaderHeartbeat().catch(() => { });
        }, LEADER_RENEW_MS);
    }

    async _tryBecomeLeader() {
        try {
            const redis = getRedisClient();
            // SET key value NX EX ttl — only sets if key doesn't exist
            const result = await redis.set(LEADER_KEY, this._processId, "EX", LEADER_TTL, "NX");
            this._isLeader = result === "OK";

            if (this._isLeader) {
                logger.info("GlobalMetricsCollector: elected as leader", { pid: process.pid });
            } else {
                logger.info("GlobalMetricsCollector: running as follower (another process is leader)", { pid: process.pid });
            }
        } catch (err) {
            // Redis error → fallback to self-leadership
            this._isLeader = true;
            logger.warn("GlobalMetricsCollector: leader election failed, defaulting to leader", { error: err.message });
        }
    }

    async _leaderHeartbeat() {
        if (!isRedisConnected()) return;

        const redis = getRedisClient();

        if (this._isLeader) {
            // Renew the lock TTL
            try {
                const current = await redis.get(LEADER_KEY);
                if (current === this._processId) {
                    await redis.expire(LEADER_KEY, LEADER_TTL);
                } else {
                    // Someone else became leader (shouldn't happen, but handle it)
                    this._isLeader = false;
                    this._stopCollecting();
                    logger.warn("GlobalMetricsCollector: lost leadership", { pid: process.pid });
                }
            } catch {
                // ignore heartbeat errors
            }
        } else {
            // Check if leader lock expired (leader process died)
            try {
                const result = await redis.set(LEADER_KEY, this._processId, "EX", LEADER_TTL, "NX");
                if (result === "OK") {
                    this._isLeader = true;
                    logger.info("GlobalMetricsCollector: took over as leader (previous leader expired)", { pid: process.pid });
                    await this._startCollecting();
                }
            } catch {
                // ignore takeover errors
            }
        }
    }

    async _startSubscriber() {
        try {
            // Pub/Sub requires a DEDICATED Redis connection (ioredis requirement)
            const redisOpts = getRedisClient().options;
            this._subscriber = new Redis({
                host: redisOpts.host,
                port: redisOpts.port,
                retryStrategy: (times) => Math.min(times * 500, 30000),
                maxRetriesPerRequest: 1,
                enableOfflineQueue: false,
                lazyConnect: false,
            });

            this._subscriber.on("error", (err) => {
                logger.debug("GlobalMetricsCollector: subscriber error", { error: err.message });
            });

            await this._subscriber.subscribe(REDIS_CHANNEL);

            this._subscriber.on("message", (_channel, message) => {
                try {
                    const { containerId, dataPoint } = JSON.parse(message);
                    if (containerId && dataPoint) {
                        this._applyCacheUpdate(containerId, dataPoint);
                    }
                } catch {
                    // ignore parse errors
                }
            });

            logger.debug("GlobalMetricsCollector: subscribed to Redis channel", { channel: REDIS_CHANNEL });
        } catch (err) {
            logger.warn("GlobalMetricsCollector: Pub/Sub subscribe failed", { error: err.message });
            // If subscriber fails, leader still works via local cache
        }
    }

    // Apply a data point to local cache (called from both local collection and Redis subscriber)
    _applyCacheUpdate(containerId, dataPoint) {
        if (!this._cache.has(containerId)) {
            this._cache.set(containerId, {
                latest: null,
                buffer: new CircularBuffer(BUFFER_SIZE),
                aggBuffer: [],
                cycleCount: 0,
            });
        }

        const entry = this._cache.get(containerId);
        entry.latest = dataPoint;
        entry.buffer.push(dataPoint);

        // Only the leader accumulates aggBuffer for persistence
        if (this._isLeader) {
            entry.aggBuffer.push(dataPoint);
            entry.cycleCount += 1;
        }

        // Notify in-process listeners (WebSocket streamer)
        const listeners = this._listeners.get(containerId);
        if (listeners && listeners.size > 0) {
            for (const fn of listeners) {
                try {
                    fn(dataPoint);
                } catch (err) {
                    logger.debug("GlobalMetricsCollector: listener error", { error: err.message });
                }
            }
        }
    }

    // Container discovery — reconcile running containers (leader only)
    async _reconcile() {
        let containers;
        try {
            containers = await docker.listContainers({ filters: { status: ["running"] } });
        } catch (err) {
            logger.warn("GlobalMetricsCollector: listContainers failed", { error: err.message });
            return;
        }

        const currentIds = new Set(containers.map((c) => c.Id.substring(0, 12)));

        for (const id of currentIds) {
            if (!this._cache.has(id)) {
                this._cache.set(id, {
                    latest: null,
                    buffer: new CircularBuffer(BUFFER_SIZE),
                    aggBuffer: [],
                    cycleCount: 0,
                });
            }
        }

        for (const id of this._cache.keys()) {
            if (!currentIds.has(id)) {
                this._cache.delete(id);
                this._listeners.delete(id);
            }
        }

        this._runningIds = currentIds;

        // Memory guard — evict if over limit
        if (this._cache.size > MAX_TRACKED_CONTAINERS) {
            logger.warn("GlobalMetricsCollector: cache exceeds limit, evicting stale entries", {
                cacheSize: this._cache.size,
                limit: MAX_TRACKED_CONTAINERS,
            });
            for (const id of this._cache.keys()) {
                if (!currentIds.has(id)) {
                    this._cache.delete(id);
                    this._listeners.delete(id);
                }
                if (this._cache.size <= MAX_TRACKED_CONTAINERS) break;
            }
        }

        logger.debug("GlobalMetricsCollector: reconciled", {
            running: currentIds.size,
            cached: this._cache.size,
        });
    }

    // Main collection — batched stats for all running containers (leader only)
    async _collectAll() {
        if (!this._running || !this._isLeader) return;

        const ids = [...this._runningIds];
        if (ids.length === 0) return;

        const cycleStart = performance.now();
        const useRedis = isRedisConnected();

        for (let i = 0; i < ids.length; i += BATCH_CONCURRENCY) {
            if (!this._running) return;

            const batch = ids.slice(i, i + BATCH_CONCURRENCY);
            const results = await Promise.allSettled(
                batch.map((id) => this._fetchStats(id)),
            );

            for (let j = 0; j < results.length; j++) {
                if (results[j].status === "fulfilled" && results[j].value) {
                    const { containerId, dataPoint } = results[j].value;

                    // Update local cache (leader's own cache)
                    this._applyCacheUpdate(containerId, dataPoint);

                    // Publish to Redis so follower workers update their caches too
                    if (useRedis) {
                        this._publishDataPoint(containerId, dataPoint);
                    }
                }
            }
        }

        this._checkPersistence();

        // Track cycle performance
        this._lastCycleMs = Math.round(performance.now() - cycleStart);
        this._lastCycleTimestamp = Date.now();
    }

    _publishDataPoint(containerId, dataPoint) {
        try {
            const redis = getRedisClient();
            const message = JSON.stringify({ containerId, dataPoint });
            redis.publish(REDIS_CHANNEL, message).catch(() => { });
        } catch {
            // non-critical, followers just won't get this update
        }
    }

    async _fetchStats(containerId) {
        try {
            const container = docker.getContainer(containerId);
            const raw = await container.stats({ stream: false });
            const dataPoint = this._parseDockerStats(raw);
            if (!dataPoint) return null;
            return { containerId, dataPoint };
        } catch (err) {
            logger.debug("GlobalMetricsCollector: stats fetch failed", {
                containerId,
                error: err.message,
            });
            return null;
        }
    }

    // Aggregation + batch persistence (leader only)
    _checkPersistence() {
        if (!this._isLeader) return;

        const toPersist = [];

        for (const [containerId, entry] of this._cache) {
            if (entry.cycleCount >= PERSIST_EVERY_N && entry.aggBuffer.length > 0) {
                const aggregate = this._computeAggregate(entry.aggBuffer);
                if (aggregate) {
                    toPersist.push({ containerId, aggregate });
                }
                entry.aggBuffer = [];
                entry.cycleCount = 0;
            }
        }

        if (toPersist.length > 0) {
            this._persistBatch(toPersist).catch((err) =>
                logger.debug("GlobalMetricsCollector: batch persist failed", { error: err.message }),
            );
        }
    }

    async _persistBatch(entries) {
        const containerIds = entries.map((e) => e.containerId);
        let ownerMap = new Map();
        try {
            const ownerships = await ContainerOwnership.find({
                containerId: { $in: containerIds },
                status: "active",
            }).lean();
            for (const o of ownerships) {
                ownerMap.set(o.containerId, o.ownerId || o.userId);
            }
        } catch (err) {
            // continue without ownerId
        }

        const docs = entries.map(({ containerId, aggregate }) => ({
            containerId,
            ownerId: ownerMap.get(containerId) || null,
            resolution: "30s",
            cpuPercent: aggregate.cpuAvg,
            cpuAvg: aggregate.cpuAvg,
            cpuMax: aggregate.cpuMax,
            cpuMin: aggregate.cpuMin,
            memoryUsedMB: aggregate.memoryAvg,
            memoryAvg: aggregate.memoryAvg,
            memoryMax: aggregate.memoryMax,
            memoryMin: aggregate.memoryMin,
            memoryLimitMB: aggregate.memoryLimitMB,
            memoryPercent: aggregate.memoryPercent,
            networkRxMB: aggregate.networkRxMB,
            networkTxMB: aggregate.networkTxMB,
        }));

        await ContainerMetric.insertMany(docs);
        logger.debug("GlobalMetricsCollector: persisted batch", { count: docs.length });
    }

    // Immediate collection — triggered by Docker events
    async triggerImmediateCollection(containerId) {
        const shortId = containerId.length > 12 ? containerId.substring(0, 12) : containerId;

        if (!this._cache.has(shortId)) {
            await this._reconcile();
        }

        // Any worker receiving the Docker event can fetch stats directly
        const result = await this._fetchStats(shortId);
        if (result) {
            this._applyCacheUpdate(result.containerId, result.dataPoint);

            // Publish so other workers see it too
            if (isRedisConnected()) {
                this._publishDataPoint(result.containerId, result.dataPoint);
            }

            logger.debug("GlobalMetricsCollector: immediate collection done", { containerId: shortId });
        }
    }

    // Public API — used by WebSocket streamer, routes, resourceMonitor
    getLatest(containerId) {
        const entry = this._cache.get(containerId);
        return entry ? entry.latest : null;
    }

    getBuffer(containerId) {
        const entry = this._cache.get(containerId);
        return entry ? entry.buffer.getAll() : [];
    }

    isTracking(containerId) {
        return this._cache.has(containerId);
    }

    getTrackedCount() {
        return this._cache.size;
    }

    getLastCycleTimestamp() {
        return this._lastCycleTimestamp;
    }

    getCollectorStats() {
        return {
            lastCycleMs: this._lastCycleMs,
            lastCycleTimestamp: this._lastCycleTimestamp,
            containersTracked: this._cache.size,
            isLeader: this._isLeader,
            pid: process.pid,
        };
    }

    getAllLatest() {
        const result = new Map();
        for (const [id, entry] of this._cache) {
            if (entry.latest) {
                result.set(id, entry.latest);
            }
        }
        return result;
    }

    onUpdate(containerId, listener) {
        if (!this._listeners.has(containerId)) {
            this._listeners.set(containerId, new Set());
        }
        this._listeners.get(containerId).add(listener);

        return () => {
            const set = this._listeners.get(containerId);
            if (set) {
                set.delete(listener);
                if (set.size === 0) this._listeners.delete(containerId);
            }
        };
    }

    // Stats parsing
    _parseDockerStats(stats) {
        try {
            const cpuDelta =
                stats.cpu_stats.cpu_usage.total_usage -
                (stats.precpu_stats.cpu_usage?.total_usage || 0);
            const systemDelta =
                stats.cpu_stats.system_cpu_usage -
                (stats.precpu_stats.system_cpu_usage || 0);
            const numCPUs = stats.cpu_stats.online_cpus || 1;

            let cpuPercent = 0;
            if (systemDelta > 0 && cpuDelta > 0) {
                cpuPercent = (cpuDelta / systemDelta) * numCPUs * 100;
            }
            cpuPercent = Math.min(Math.round(cpuPercent * 10) / 10, 100);

            const cacheBytes = stats.memory_stats.stats?.cache || 0;
            const usedBytes = (stats.memory_stats.usage || 0) - cacheBytes;
            const limitBytes = stats.memory_stats.limit || 1;

            const memoryUsedMB = Math.round(usedBytes / (1024 * 1024));
            const memoryLimitMB = Math.round(limitBytes / (1024 * 1024));
            const memoryPercent = Math.min(
                Math.round((usedBytes / limitBytes) * 100 * 10) / 10,
                100,
            );

            let totalRx = 0;
            let totalTx = 0;
            if (stats.networks) {
                for (const iface of Object.values(stats.networks)) {
                    totalRx += iface.rx_bytes || 0;
                    totalTx += iface.tx_bytes || 0;
                }
            }
            const networkRxMB = Math.round((totalRx / (1024 * 1024)) * 100) / 100;
            const networkTxMB = Math.round((totalTx / (1024 * 1024)) * 100) / 100;

            return {
                timestamp: Date.now(),
                cpuPercent,
                memoryUsedMB,
                memoryLimitMB,
                memoryPercent,
                networkRxMB,
                networkTxMB,
            };
        } catch {
            return null;
        }
    }

    _computeAggregate(points) {
        if (!points || points.length === 0) return null;
        const last = points[points.length - 1];

        const avg = (key) => {
            const sum = points.reduce((s, p) => s + (p[key] || 0), 0);
            return round(sum / points.length);
        };
        const max = (key) => round(Math.max(...points.map((p) => p[key] || 0)));
        const min = (key) => round(Math.min(...points.map((p) => p[key] || 0)));

        return {
            cpuAvg: avg("cpuPercent"),
            cpuMax: max("cpuPercent"),
            cpuMin: min("cpuPercent"),
            memoryAvg: avg("memoryUsedMB"),
            memoryMax: max("memoryUsedMB"),
            memoryMin: min("memoryUsedMB"),
            memoryLimitMB: last.memoryLimitMB,
            memoryPercent: avg("memoryPercent"),
            networkRxMB: last.networkRxMB,
            networkTxMB: last.networkTxMB,
        };
    }
}

function round(value, decimals = 1) {
    if (value == null || isNaN(value)) return 0;
    const factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
}

export default new GlobalMetricsCollector();
