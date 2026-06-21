import logger from '../utils/logger.js';

const subscribers = new Map();

export function subscribeToPipeline(runId, ws) {
    if (!subscribers.has(runId)) {
        subscribers.set(runId, new Set());
    }
    subscribers.get(runId).add(ws);

    ws.on('close', () => {
        const subs = subscribers.get(runId);
        if (subs) {
            subs.delete(ws);
            if (subs.size === 0) {
                subscribers.delete(runId);
            }
        }
    });

    logger.debug('WebSocket subscribed to pipeline logs', { runId });
}

export function broadcastLog(runId, logLine) {
    const subs = subscribers.get(runId);
    if (!subs || subs.size === 0) return;

    const message = JSON.stringify({ type: 'pipeline_log', runId, data: logLine });

    for (const ws of subs) {
        try {
            if (ws.readyState === ws.OPEN) {
                ws.send(message);
            }
        } catch (error) {
            logger.debug('Failed to send pipeline log to subscriber', { runId, error: error.message });
        }
    }
}

export function broadcastStatus(run) {
    if (!run || !run._id) return;
    const runId = String(run._id);
    const subs = subscribers.get(runId);
    if (!subs || subs.size === 0) return;

    // Use step_update for intermediate statuses
    let type = 'step_update';
    if (run.status === 'success' || run.status === 'failed') {
        type = 'pipeline_complete';
    }

    const message = JSON.stringify({ 
        type, 
        runId, 
        status: run.status,
        steps: run.steps 
    });

    for (const ws of subs) {
        try {
            if (ws.readyState === ws.OPEN) {
                ws.send(message);
                if (type === 'pipeline_complete') {
                    ws.close(1000, 'Pipeline complete');
                }
            }
        } catch (error) {
            logger.debug('Failed to send pipeline status to subscriber', { runId, error: error.message });
        }
    }

    if (type === 'pipeline_complete') {
        subscribers.delete(runId);
    }
}

export default { subscribeToPipeline, broadcastLog, broadcastStatus };
