import docker from "../docker/client.js";
import logger from "../utils/logger.js";
import ContainerOwnership from "../models/ContainerOwnership.js";
import quotaService from "./quota.service.js";
import alertService from "./alert.service.js";
import { ALERT_TYPES, ALERT_SEVERITIES } from "../models/alert.model.js";
import Quota from "../models/quota.model.js";
import globalMetricsCollector from "./globalMetricsCollector.js";

class ResourceMonitorService {
    constructor() {
        this._interval = null;
        this._running = false;
    }
    // Start the resource monitor scheduler.
    // Polls Docker stats every 10 seconds and updates per-user quota usage.
    start() {
        if (this._interval) return;

        logger.info("Resource monitor started (10s interval)");

        // Run once immediately, then schedule
        this.collectContainerStats().catch((err) => {
            logger.warn("Initial resource collection failed", { error: err.message });
        });

        this._interval = setInterval(() => {
            this.collectContainerStats().catch((err) => {
                logger.warn("Resource monitor tick failed", { error: err.message });
            });
        }, 10_000);
    }
    stop() {
        if (this._interval) {
            clearInterval(this._interval);
            this._interval = null;
            logger.info("Resource monitor stopped");
        }
    }
    async collectContainerStats() {
        if (this._running) return; // guard against overlapping runs
        this._running = true;

        try {
            // 0. Reconcile orphaned ownership records
            await this._cleanupOrphanedOwnerships();

            // 1. List running containers
            const containers = await docker.listContainers({ filters: { status: ["running"] } });

            if (containers.length === 0) {
                // No running containers — reset all active user quotas to 0
                await this._resetAllUsage();
                return;
            }

            // 2. Get container IDs (short 12-char form used in ownership records)
            const containerIds = containers.map((c) => c.Id.substring(0, 12));

            // 3. Look up ownership for all running containers
            const ownerships = await ContainerOwnership.find({
                containerId: { $in: containerIds },
                status: "active",
            }).lean();

            const ownerMap = new Map(); // containerId → userId
            for (const o of ownerships) {
                ownerMap.set(o.containerId, o.ownerId.toString());
            }

            // 3b. Count ALL active ownerships per user (for container count reconciliation)
            const allActiveOwnerships = await ContainerOwnership.find({ status: "active" }).lean();
            const containerCountPerUser = new Map(); // userId → count
            for (const o of allActiveOwnerships) {
                const uid = o.ownerId.toString();
                containerCountPerUser.set(uid, (containerCountPerUser.get(uid) || 0) + 1);
            }

            // 4. Fetch stats for each container and compute usage
            const perUser = new Map(); // userId → { cpu, memoryMB }

            await Promise.allSettled(
                containers.map(async (c) => {
                    const shortId = c.Id.substring(0, 12);
                    const userId = ownerMap.get(shortId);
                    if (!userId) return; // unowned container, skip

                    try {
                        // Try reading from globalMetricsCollector cache first (zero Docker calls)
                        const cached = globalMetricsCollector.getLatest(shortId);
                        let cpuCores, memoryMB;

                        if (cached) {
                            // Convert CPU% to cores: cpuPercent / 100 * numCPUs
                            // We approximate with cpuPercent / 100 (normalized across all cores)
                            cpuCores = (cached.cpuPercent || 0) / 100;
                            memoryMB = cached.memoryUsedMB || 0;
                        } else {
                            // Fallback: direct Docker stats call (cache miss — container just started)
                            const container = docker.getContainer(c.Id);
                            const stats = await container.stats({ stream: false });
                            cpuCores = this._calculateCPUCores(stats);
                            memoryMB = this._calculateMemoryMB(stats);
                        }

                        const existing = perUser.get(userId) || { cpu: 0, memoryMB: 0 };
                        existing.cpu += cpuCores;
                        existing.memoryMB += memoryMB;
                        perUser.set(userId, existing);
                    } catch (err) {
                        logger.debug("Failed to fetch stats for container", {
                            containerId: shortId,
                            error: err.message,
                        });
                    }
                })
            );

            // 5. Update quota for each user who has running containers
            for (const [userId, usage] of perUser.entries()) {
                try {
                    const count = containerCountPerUser.get(userId) || 0;
                    await quotaService.updateRealUsage(userId, usage.cpu, usage.memoryMB, count);

                    // Check resource thresholds and generate alerts
                    await this._checkResourceThresholds(userId, usage.cpu, usage.memoryMB, count);
                } catch (err) {
                    logger.debug("Failed to update real usage for user", {
                        userId,
                        error: err.message,
                    });
                }
            }

            // 6. For users with ownership records but NO running containers now,
            //    reset their CPU/memory to 0, but keep accurate container count
            const activeOwners = await ContainerOwnership.distinct("ownerId", { status: "active" });
            for (const ownerId of activeOwners) {
                const uid = ownerId.toString();
                if (!perUser.has(uid)) {
                    try {
                        const count = containerCountPerUser.get(uid) || 0;
                        await quotaService.updateRealUsage(uid, 0, 0, count);
                    } catch (_) {
                        // ignore
                    }
                }
            }
        } catch (err) {
            logger.warn("Resource monitor collection error", { error: err.message });
        } finally {
            this._running = false;
        }
    }
    // Calculate CPU usage in cores from Docker stats.
    _calculateCPUCores(stats) {
        try {
            const cpuDelta =
                stats.cpu_stats.cpu_usage.total_usage -
                (stats.precpu_stats.cpu_usage?.total_usage || 0);
            const systemDelta =
                stats.cpu_stats.system_cpu_usage -
                (stats.precpu_stats.system_cpu_usage || 0);
            const numCPUs = stats.cpu_stats.online_cpus || 1;

            if (systemDelta > 0 && cpuDelta > 0) {
                return (cpuDelta / systemDelta) * numCPUs;
            }
            return 0;
        } catch {
            return 0;
        }
    }
    // Calculate actual memory usage in MB from Docker stats.
    _calculateMemoryMB(stats) {
        try {
            const usedBytes =
                stats.memory_stats.usage - (stats.memory_stats.stats?.cache || 0);
            return Math.max(0, usedBytes / (1024 * 1024));
        } catch {
            return 0;
        }
    }

    // Clean up ownership records for containers that no longer exist in Docker.
    async _cleanupOrphanedOwnerships() {
        try {
            // List ALL containers (running + stopped)
            const allContainers = await docker.listContainers({ all: true });
            const dockerIds = new Set(allContainers.map((c) => c.Id.substring(0, 12)));

            // Find active ownership records
            const activeOwnerships = await ContainerOwnership.find({ status: "active" }).lean();

            // Release orphaned ones
            for (const ownership of activeOwnerships) {
                if (!dockerIds.has(ownership.containerId)) {
                    await ContainerOwnership.findByIdAndUpdate(ownership._id, {
                        status: "released",
                    });
                    logger.info("Released orphaned ownership", {
                        containerId: ownership.containerId,
                        userId: ownership.ownerId.toString(),
                    });
                }
            }
        } catch (err) {
            logger.debug("Orphan cleanup failed", { error: err.message });
        }
    }

    // Reset CPU/memory usage to 0 for all users who have active ownerships.
    async _resetAllUsage() {
        try {
            const activeOwners = await ContainerOwnership.distinct("ownerId", { status: "active" });
            for (const ownerId of activeOwners) {
                await quotaService.updateRealUsage(ownerId.toString(), 0, 0).catch(() => { });
            }
        } catch (err) {
            logger.debug("Reset all usage failed", { error: err.message });
        }
    }

    // Check resource thresholds against quota limits and generate alerts.
    async _checkResourceThresholds(userId, cpuCores, memoryMB, containerCount) {
        try {
            const quota = await Quota.findOne({ userId }).lean();
            if (!quota) return;

            const cpuPercent = quota.maxCPU > 0 ? (cpuCores / quota.maxCPU) * 100 : 0;
            const memoryPercent = quota.maxMemoryMB > 0 ? (memoryMB / quota.maxMemoryMB) * 100 : 0;
            const containerPercent = quota.maxContainers > 0 ? (containerCount / quota.maxContainers) * 100 : 0;

            // CPU threshold alerts
            if (cpuPercent >= 95) {
                await alertService.createAlert({
                    userId,
                    type: ALERT_TYPES.HIGH_CPU,
                    severity: ALERT_SEVERITIES.CRITICAL,
                    message: `CPU usage at ${cpuPercent.toFixed(1)}% of quota (${cpuCores.toFixed(2)} / ${quota.maxCPU} cores)`,
                    metadata: { cpuCores, maxCPU: quota.maxCPU, percent: cpuPercent },
                });
            } else if (cpuPercent >= 80) {
                await alertService.createAlert({
                    userId,
                    type: ALERT_TYPES.HIGH_CPU,
                    severity: ALERT_SEVERITIES.WARNING,
                    message: `CPU usage at ${cpuPercent.toFixed(1)}% of quota (${cpuCores.toFixed(2)} / ${quota.maxCPU} cores)`,
                    metadata: { cpuCores, maxCPU: quota.maxCPU, percent: cpuPercent },
                });
            }

            // Memory threshold alerts
            if (memoryPercent >= 95) {
                await alertService.createAlert({
                    userId,
                    type: ALERT_TYPES.HIGH_MEMORY,
                    severity: ALERT_SEVERITIES.CRITICAL,
                    message: `Memory usage at ${memoryPercent.toFixed(1)}% of quota (${Math.round(memoryMB)} / ${quota.maxMemoryMB} MB)`,
                    metadata: { memoryMB, maxMemoryMB: quota.maxMemoryMB, percent: memoryPercent },
                });
            } else if (memoryPercent >= 80) {
                await alertService.createAlert({
                    userId,
                    type: ALERT_TYPES.HIGH_MEMORY,
                    severity: ALERT_SEVERITIES.WARNING,
                    message: `Memory usage at ${memoryPercent.toFixed(1)}% of quota (${Math.round(memoryMB)} / ${quota.maxMemoryMB} MB)`,
                    metadata: { memoryMB, maxMemoryMB: quota.maxMemoryMB, percent: memoryPercent },
                });
            }

            // Quota container count approaching limit
            if (containerPercent >= 80 && containerCount < quota.maxContainers) {
                await alertService.createAlert({
                    userId,
                    type: ALERT_TYPES.QUOTA_WARNING,
                    severity: ALERT_SEVERITIES.WARNING,
                    message: `Container quota at ${containerCount}/${quota.maxContainers} (${containerPercent.toFixed(0)}% used)`,
                    metadata: { containerCount, maxContainers: quota.maxContainers, percent: containerPercent },
                });
            }
        } catch (err) {
            logger.debug("Threshold alert check failed", { userId, error: err.message });
        }
    }
}

export default new ResourceMonitorService();
