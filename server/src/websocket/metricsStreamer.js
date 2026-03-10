import logger from "../utils/logger.js";
import globalMetricsCollector from "../services/globalMetricsCollector.js";
import { queryMetricsByRange as _queryMetricsByRange } from "../helpers/metrics.helpers.js";

// Active streams keyed by containerId
const streams = new Map();


export function subscribeToMetrics(containerId, ws) {
    if (!streams.has(containerId)) {
        streams.set(containerId, {
            subscribers: new Set(),
            unsubscribe: null,     // collector listener cleanup
        });
    }

    const stream = streams.get(containerId);
    stream.subscribers.add(ws);

    // Seed the client with the 2-minute buffer from the collector cache
    const history = globalMetricsCollector.getBuffer(containerId);
    if (history.length > 0) {
        try {
            ws.send(JSON.stringify({
                type: "metrics_history",
                containerId,
                dataPoints: history,
            }));
        } catch (_) { /* ignore send errors */ }
    }

    // Start listening to collector updates if this is the first subscriber
    if (!stream.unsubscribe) {
        startListening(containerId, stream);
    }

    ws.on("close", () => {
        stream.subscribers.delete(ws);
        if (stream.subscribers.size === 0) {
            stopListening(containerId, stream);
        }
    });

    logger.info("Metrics subscriber added", {
        containerId,
        subscriberCount: stream.subscribers.size,
    });
}

export function getMetricsHistory(containerId) {
    // Return buffer from the global collector (always available, even if no WS open)
    return globalMetricsCollector.getBuffer(containerId);
}

export function getTopContainers() {
    const allLatest = globalMetricsCollector.getAllLatest();
    const latest = [];

    for (const [containerId, data] of allLatest) {
        latest.push({
            containerId,
            containerName: containerId.substring(0, 12),
            cpuPercent: data.cpuPercent,
            memoryUsedMB: data.memoryUsedMB,
            memoryLimitMB: data.memoryLimitMB,
        });
    }

    return {
        topCPU: [...latest].sort((a, b) => b.cpuPercent - a.cpuPercent).slice(0, 5),
        topMemory: [...latest].sort((a, b) => b.memoryUsedMB - a.memoryUsedMB).slice(0, 5),
    };
}

export function removeStream(containerId) {
    const stream = streams.get(containerId);
    if (stream) {
        stopListening(containerId, stream);
        streams.delete(containerId);
    }
}

export function stopAllStreams() {
    for (const [containerId, stream] of streams.entries()) {
        stopListening(containerId, stream);
    }
    streams.clear();
}

export async function queryMetricsByRange(containerId, range = "1m") {
    return _queryMetricsByRange(containerId, range, getMetricsHistory(containerId));
}

// Internal — listener-based streaming from global collector

function startListening(containerId, stream) {
    logger.debug("Starting metrics listener", { containerId });

    const onDataPoint = (dataPoint) => {
        // Broadcast to all WebSocket subscribers
        const message = JSON.stringify({
            type: "container_metrics",
            containerId,
            status: "ok",
            ...dataPoint,
        });

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
    };

    // Register with the global collector — fires on every new data point
    stream.unsubscribe = globalMetricsCollector.onUpdate(containerId, onDataPoint);
}

function stopListening(containerId, stream) {
    if (stream.unsubscribe) {
        stream.unsubscribe();
        stream.unsubscribe = null;
        logger.debug("Stopped metrics listener", { containerId });
    }
}
