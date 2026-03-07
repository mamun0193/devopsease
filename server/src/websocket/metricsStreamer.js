import logger from "../utils/logger.js";
import containerStatsService from "../services/containerStats.service.js";
import {
    CircularBuffer,
    broadcast,
    persistMetric,
    computeTopContainers,
    BUFFER_SIZE,
    POLL_INTERVAL_MS,
    PERSIST_EVERY_N,
} from "../helpers/metrics.helpers.js";
import { queryMetricsByRange as _queryMetricsByRange } from "../helpers/metrics.helpers.js";

// Active streams: containerId → { subscribers, interval, buffer, pollCount }
const streams = new Map();


export function subscribeToMetrics(containerId, ws) {
    if (!streams.has(containerId)) {
        streams.set(containerId, {
            subscribers: new Set(),
            interval: null,
            buffer: new CircularBuffer(BUFFER_SIZE),
            pollCount: 0,
        });
    }

    const stream = streams.get(containerId);
    stream.subscribers.add(ws);

    // Send existing buffer so client can render the chart immediately
    const history = stream.buffer.getAll();
    if (history.length > 0) {
        try {
            ws.send(JSON.stringify({ type: "metrics_history", containerId, dataPoints: history }));
        } catch (_) { /* ignore */ }
    }

    if (!stream.interval) {
        startPolling(containerId, stream);
    }

    ws.on("close", () => {
        stream.subscribers.delete(ws);
        if (stream.subscribers.size === 0) {
            stopPolling(containerId, stream);
        }
    });

    logger.info("Metrics subscriber added", { containerId, subscriberCount: stream.subscribers.size });
}

export function getMetricsHistory(containerId) {
    const stream = streams.get(containerId);
    return stream ? stream.buffer.getAll() : [];
}

export function getTopContainers() {
    return computeTopContainers(streams);
}


// Remove stream and stop polling when container is removed or on shutdown
export function removeStream(containerId) {
    const stream = streams.get(containerId);
    if (stream) {
        stopPolling(containerId, stream);
        streams.delete(containerId);
    }
}


export function stopAllStreams() {
    for (const [containerId, stream] of streams.entries()) {
        stopPolling(containerId, stream);
    }
    streams.clear();
}

export async function queryMetricsByRange(containerId, range = "1m") {
    return _queryMetricsByRange(containerId, range, getMetricsHistory(containerId));
}

function startPolling(containerId, stream) {
    logger.debug("Starting metrics polling", { containerId });

    const poll = async () => {
        try {
            const result = await containerStatsService.getContainerStats(containerId);

            if (!result.success) {
                broadcast(containerId, stream, {
                    type: "container_metrics",
                    containerId,
                    status: "unavailable",
                    timestamp: Date.now(),
                });
                return;
            }

            const dataPoint = {
                timestamp: Date.now(),
                cpuPercent: result.data.cpu.usagePercent,
                memoryUsedMB: result.data.memory.usedMB,
                memoryLimitMB: result.data.memory.limitMB,
                memoryPercent: result.data.memory.usagePercent,
                networkRxMB: result.data.network.rxMB,
                networkTxMB: result.data.network.txMB,
            };

            stream.buffer.push(dataPoint);

            // Persist to MongoDB every PERSIST_EVERY_N polls (~30s)
            stream.pollCount = (stream.pollCount || 0) + 1;
            if (stream.pollCount >= PERSIST_EVERY_N) {
                stream.pollCount = 0;
                persistMetric(containerId, dataPoint).catch((err) =>
                    logger.debug("Failed to persist metric", { containerId, error: err.message })
                );
            }

            broadcast(containerId, stream, {
                type: "container_metrics",
                containerId,
                status: "ok",
                ...dataPoint,
            });
        } catch (err) {
            logger.debug("Metrics poll error", { containerId, error: err.message });
        }
    };

    poll();
    stream.interval = setInterval(poll, POLL_INTERVAL_MS);
}

function stopPolling(containerId, stream) {
    if (stream.interval) {
        clearInterval(stream.interval);
        stream.interval = null;
        logger.debug("Stopped metrics polling", { containerId });
    }
}
