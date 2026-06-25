import logger from '../utils/logger.js';

const subscribers = new Map(); // executionId -> Set of WebSocket clients

export function registerClient(executionId, ws) {
    if (!subscribers.has(executionId)) {
        subscribers.set(executionId, new Set());
    }
    subscribers.get(executionId).add(ws);

    logger.info(`WebSocket connected for execution: ${executionId}`);

    ws.on('close', () => {
        const subs = subscribers.get(executionId);
        if (subs) {
            subs.delete(ws);
            if (subs.size === 0) {
                subscribers.delete(executionId);
            }
        }
        logger.info(`WebSocket disconnected for execution: ${executionId}`);
    });
}

export function broadcastExecutionEvent(executionId, eventType, data) {
    const subs = subscribers.get(executionId);
    if (subs) {
        const message = JSON.stringify({
            executionId,
            eventType, // e.g. 'deployment-started', 'image-building', 'log'
            timestamp: new Date().toISOString(),
            data
        });
        
        for (const client of subs) {
            if (client.readyState === 1 /* WebSocket.OPEN */) {
                client.send(message);
            }
        }
    }
}
