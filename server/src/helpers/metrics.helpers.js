import ContainerMetric from "../models/containerMetric.model.js";
import ContainerOwnership from "../models/ContainerOwnership.js";
import logger from "../utils/logger.js";

export const BUFFER_SIZE = 60;
export const POLL_INTERVAL_MS = 10_000; // 10s — matches industry standard (Prometheus 15s, CloudWatch 60s)
export const PERSIST_EVERY_N = 3;    // persist every 3 polls → ~30s

export const RANGE_MS = {
    "1m": 60 * 1000,
    "1h": 60 * 60 * 1000,
    "1d": 24 * 60 * 60 * 1000,
    "1w": 7 * 24 * 60 * 60 * 1000,
};

// Resolution mapping: which resolution tier to query for each range
const RANGE_TO_RESOLUTION = {
    "1h": "30s",
    "1d": "10m",
    "1w": "1h",
};

export class CircularBuffer {
    constructor(size) {
        this.size = size;
        this.buffer = [];
    }

    push(item) {
        if (this.buffer.length >= this.size) {
            this.buffer.shift();
        }
        this.buffer.push(item);
    }

    getAll() {
        return [...this.buffer];
    }

    clear() {
        this.buffer = [];
    }
}

// Send JSON 
export function broadcast(containerId, stream, payload) {
    const message = JSON.stringify(payload);
    for (const ws of stream.subscribers) {
        try {
            if (ws.readyState === ws.OPEN) {
                ws.send(message);
            }
        } catch (err) {
            logger.debug("Failed to send metrics to subscriber", {
                containerId,
                error: err.message,
            });
        }
    }
}

// Aggregation helpers for 30s persistence

function avg(arr, key) {
    if (arr.length === 0) return 0;
    return arr.reduce((sum, p) => sum + (p[key] || 0), 0) / arr.length;
}

function maxVal(arr, key) {
    return Math.max(...arr.map((p) => p[key] || 0));
}

function minVal(arr, key) {
    return Math.min(...arr.map((p) => p[key] || 0));
}

function round(value, decimals = 1) {
    if (value == null || isNaN(value)) return 0;
    const factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
}

// Compute aggregate metrics for a set of data points (e.g. 30s → 10m). Returns an object with avg/max/min for CPU and memory, as well as the latest network I/O values.
export function computeAggregate(points) {
    if (!points || points.length === 0) return null;
    const last = points[points.length - 1];

    return {
        cpuPercent: round(avg(points, "cpuPercent")),
        cpuAvg: round(avg(points, "cpuPercent")),
        cpuMax: round(maxVal(points, "cpuPercent")),
        cpuMin: round(minVal(points, "cpuPercent")),
        memoryUsedMB: round(avg(points, "memoryUsedMB")),
        memoryAvg: round(avg(points, "memoryUsedMB")),
        memoryMax: round(maxVal(points, "memoryUsedMB")),
        memoryMin: round(minVal(points, "memoryUsedMB")),
        memoryLimitMB: last.memoryLimitMB,
        memoryPercent: round(avg(points, "memoryPercent")),
        networkRxMB: last.networkRxMB,
        networkTxMB: last.networkTxMB,
    };
}

// Persist an aggregated metric to the database. Looks up the container ownership to set the ownerId field for easier querying later.

export async function persistMetric(containerId, aggregate) {
    let ownerId = null;
    try {
        const ownership = await ContainerOwnership.findOne({ containerId }).lean();
        if (ownership) ownerId = ownership.userId;
    } catch (err) {
        // continue without ownerId
    }

    await ContainerMetric.create({
        containerId,
        ownerId,
        resolution: "30s",
        cpuPercent: aggregate.cpuPercent,
        cpuAvg: aggregate.cpuAvg,
        cpuMax: aggregate.cpuMax,
        cpuMin: aggregate.cpuMin,
        memoryUsedMB: aggregate.memoryUsedMB,
        memoryAvg: aggregate.memoryAvg,
        memoryMax: aggregate.memoryMax,
        memoryMin: aggregate.memoryMin,
        memoryLimitMB: aggregate.memoryLimitMB,
        memoryPercent: aggregate.memoryPercent,
        networkRxMB: aggregate.networkRxMB,
        networkTxMB: aggregate.networkTxMB,
    });
}

export async function queryMetricsByRange(containerId, range = "1m", inMemoryFallback = []) {
    if (range === "1m") {
        return inMemoryFallback;
    }

    const resolution = RANGE_TO_RESOLUTION[range];
    const ms = RANGE_MS[range];
    if (!ms) return [];

    const since = new Date(Date.now() - ms);

    // Build the query filter
    let filter;
    if (resolution === "30s") {
        // Include legacy records that have no resolution field yet
        filter = {
            containerId,
            $or: [{ resolution: "30s" }, { resolution: { $exists: false } }],
            timestamp: { $gte: since },
        };
    } else {
        filter = {
            containerId,
            resolution,
            timestamp: { $gte: since },
        };
    }

    let docs = await ContainerMetric.find(filter, {
        _id: 0,
        __v: 0,
        ownerId: 0,
    })
        .sort({ timestamp: 1 })
        .lean();

    // Fallback: if no aggregated data exists for 10m/1h, try 30s data
    if (docs.length === 0 && resolution !== "30s") {
        docs = await ContainerMetric.find(
            {
                containerId,
                $or: [{ resolution: "30s" }, { resolution: { $exists: false } }],
                timestamp: { $gte: since },
            },
            { _id: 0, __v: 0, ownerId: 0 }
        )
            .sort({ timestamp: 1 })
            .lean();
    }

    return docs.map((d) => ({
        timestamp: new Date(d.timestamp).getTime(),
        cpuPercent: d.cpuAvg ?? d.cpuPercent ?? 0,
        cpuMin: d.cpuMin,
        cpuMax: d.cpuMax,
        memoryUsedMB: d.memoryAvg ?? d.memoryUsedMB ?? 0,
        memoryMin: d.memoryMin,
        memoryMax: d.memoryMax,
        memoryLimitMB: d.memoryLimitMB ?? 0,
        memoryPercent: d.memoryPercent ?? 0,
        networkRxMB: d.networkRxMB ?? 0,
        networkTxMB: d.networkTxMB ?? 0,
    }));
}

// Top containers 
export function computeTopContainers(streams) {
    const latest = [];

    for (const [containerId, stream] of streams.entries()) {
        const history = stream.buffer.getAll();
        if (history.length === 0) continue;
        const last = history[history.length - 1];
        latest.push({
            containerId,
            containerName: last.containerName || containerId.substring(0, 12),
            cpuPercent: last.cpuPercent,
            memoryUsedMB: last.memoryUsedMB,
            memoryLimitMB: last.memoryLimitMB,
        });
    }

    return {
        topCPU: [...latest].sort((a, b) => b.cpuPercent - a.cpuPercent).slice(0, 5),
        topMemory: [...latest].sort((a, b) => b.memoryUsedMB - a.memoryUsedMB).slice(0, 5),
    };
}
