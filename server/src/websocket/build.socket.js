import logger from '../utils/logger.js';

// In-memory subscriber map: buildId → Set<ws>
const subscribers = new Map();

export function subscribeToBuild(buildId, ws) {
    if (!subscribers.has(buildId)) {
        subscribers.set(buildId, new Set());
    }
    subscribers.get(buildId).add(ws);

    ws.on('close', () => {
        const subs = subscribers.get(buildId);
        if (subs) {
            subs.delete(ws);
            if (subs.size === 0) {
                subscribers.delete(buildId);
            }
        }
    });

    logger.debug('WebSocket subscribed to build logs', { buildId });
}

export function broadcastBuildLog(buildId, logLine) {
    const subs = subscribers.get(buildId);
    if (!subs || subs.size === 0) return;

    const message = JSON.stringify({ type: 'build_log', buildId, data: logLine });

    for (const ws of subs) {
        try {
            if (ws.readyState === ws.OPEN) {
                ws.send(message);
            }
        } catch (error) {
            logger.debug('Failed to send build log to subscriber', { buildId, error: error.message });
        }
    }
}

export function broadcastBuildComplete(buildId, status) {
    const subs = subscribers.get(buildId);
    if (!subs || subs.size === 0) return;

    const message = JSON.stringify({ type: 'build_complete', buildId, status });

    for (const ws of subs) {
        try {
            if (ws.readyState === ws.OPEN) {
                ws.send(message);
                ws.close(1000, 'Build complete');
            }
        } catch (error) {
            logger.debug('Failed to send build complete to subscriber', { buildId, error: error.message });
        }
    }

    subscribers.delete(buildId);
}
