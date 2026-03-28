import logger from '../utils/logger.js';

// Deployment broadcaster class to broadcast deployment status updates to all connected clients.
class DeploymentBroadcaster {
    constructor() {
        this._connections = new Map();
    }

    // Register a WebSocket connection for a user.
    register(userId, ws) {
        const uid = String(userId);
        if (!this._connections.has(uid)) {
            this._connections.set(uid, new Set());
        }
        this._connections.get(uid).add(ws);

        ws.on('close', () => this.unregister(uid, ws));
        ws.on('error', () => this.unregister(uid, ws));

        logger.debug('Deployment broadcaster: client registered', {
            userId: uid,
            total: this._connections.get(uid).size,
        });
    }

    // Unregister WebSocket connection for a user.
    unregister(userId, ws) {
        const uid = String(userId);
        const sockets = this._connections.get(uid);
        if (!sockets) return;

        sockets.delete(ws);
        if (sockets.size === 0) {
            this._connections.delete(uid);
        }
    }

    // Broadcast a deployment status update to ALL connected clients.

    broadcast(deployment) {
        if (!deployment) return;

        const payload = JSON.stringify({
            type: 'deployment:update',
            data: {
                deploymentId: String(deployment._id),
                status: deployment.status,
                environment: deployment.environment,
                updatedAt: deployment.updatedAt ?? new Date().toISOString(),
            },
        });

        for (const [uid, sockets] of this._connections) {
            for (const ws of sockets) {
                try {
                    if (ws.readyState === ws.OPEN) {
                        ws.send(payload);
                    }
                } catch (err) {
                    logger.debug('Deployment broadcaster: send failed', {
                        userId: uid,
                        error: err.message,
                    });
                }
            }
        }
    }

    broadcastLogs(deploymentId, logs) {
        if (!deploymentId || !Array.isArray(logs)) return;

        const payload = JSON.stringify({
            type: 'deployment:logs',
            data: {
                deploymentId: String(deploymentId),
                logs,
            },
        });

        for (const [uid, sockets] of this._connections) {
            for (const ws of sockets) {
                try {
                    if (ws.readyState === ws.OPEN) {
                        ws.send(payload);
                    }
                } catch (err) {
                    logger.debug('Deployment broadcaster: broadcastLogs failed', {
                        userId: uid,
                        error: err.message,
                    });
                }
            }
        }
    }

    // Get total active connection count.
     
    get connectionCount() {
        let count = 0;
        for (const sockets of this._connections.values()) {
            count += sockets.size;
        }
        return count;
    }

    // Close all connections (shutdown).
    closeAll() {
        for (const [, sockets] of this._connections) {
            for (const ws of sockets) {
                try {
                    ws.close(1001, 'Server shutting down');
                } catch (_) {
                    /* ignore */
                }
            }
        }
        this._connections.clear();
    }
}

const deploymentBroadcaster = new DeploymentBroadcaster();
export default deploymentBroadcaster;
