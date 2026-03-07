import ContainerMetric from "../models/containerMetric.model.js";
import ContainerOwnership from "../models/ContainerOwnership.js";
import logger from "../utils/logger.js";

export const BUFFER_SIZE = 60;
export const POLL_INTERVAL_MS = 2000;
export const PERSIST_EVERY_N = 15; // persist every 15 polls → ~30s

export const RANGE_MS = {
    "1m": 60 * 1000,
    "1h": 60 * 60 * 1000,
    "1d": 24 * 60 * 60 * 1000,
    "1w": 7 * 24 * 60 * 60 * 1000,
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

//

export async function persistMetric(containerId, dataPoint) {
    let ownerId = null;
    try {
        const ownership = await ContainerOwnership.findOne({ containerId }).lean();
        if (ownership) ownerId = ownership.userId;
    } catch (err) {
        
    }

    await ContainerMetric.create({
        containerId,
        ownerId,
        cpuPercent: dataPoint.cpuPercent,
        memoryUsedMB: dataPoint.memoryUsedMB,
        memoryLimitMB: dataPoint.memoryLimitMB,
        memoryPercent: dataPoint.memoryPercent,
        networkRxMB: dataPoint.networkRxMB,
        networkTxMB: dataPoint.networkTxMB,
    });
}

// History
export async function queryMetricsByRange(containerId, range = "1m", inMemoryFallback = []) {
    if (range === "1m") {
        return inMemoryFallback;
    }

    const ms = RANGE_MS[range];
    if (!ms) return [];

    const since = new Date(Date.now() - ms);

    const docs = await ContainerMetric.find(
        { containerId, timestamp: { $gte: since } },
        { _id: 0, __v: 0, ownerId: 0 }
    )
        .sort({ timestamp: 1 })
        .lean();

    return docs.map((d) => ({
        timestamp: new Date(d.timestamp).getTime(),
        cpuPercent: d.cpuPercent,
        memoryUsedMB: d.memoryUsedMB,
        memoryLimitMB: d.memoryLimitMB,
        memoryPercent: d.memoryPercent,
        networkRxMB: d.networkRxMB,
        networkTxMB: d.networkTxMB,
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
