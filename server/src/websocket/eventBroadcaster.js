import logger from "../utils/logger.js";

/**
 * EventBroadcaster manages WebSocket connections for real-time container/action events.
 * Similar to AlertBroadcaster but broadcasts container lifecycle events
 * (container_update, action_history_updated, container_health_updated)
 * so the frontend can refetch queries instead of polling.
 */
class EventBroadcaster {
    constructor() {
        /** @type {Map<string, Set<WebSocket>>} userId → Set<WebSocket> */
        this._connections = new Map();
    }

    /**
     * Register a WebSocket connection for a user.
     */
    register(userId, ws) {
        const uid = String(userId);
        if (!this._connections.has(uid)) {
            this._connections.set(uid, new Set());
        }
        this._connections.get(uid).add(ws);

        ws.on("close", () => this.unregister(uid, ws));
        ws.on("error", () => this.unregister(uid, ws));

        logger.debug("Event broadcaster: client registered", {
            userId: uid,
            total: this._connections.get(uid).size,
        });
    }

    /**
     * Unregister a WebSocket connection for a user.
     */
    unregister(userId, ws) {
        const uid = String(userId);
        const sockets = this._connections.get(uid);
        if (!sockets) return;

        sockets.delete(ws);
        if (sockets.size === 0) {
            this._connections.delete(uid);
        }
    }

    /**
     * Broadcast an event to a specific user's connections.
     * @param {string} userId
     * @param {string} eventType - e.g. 'container_update', 'action_history_updated', 'container_health_updated'
     * @param {object} [data] - optional payload
     */
    broadcastToUser(userId, eventType, data = {}) {
        const uid = String(userId);
        const sockets = this._connections.get(uid);
        if (!sockets || sockets.size === 0) return;

        const payload = JSON.stringify({ type: eventType, data });

        for (const ws of sockets) {
            try {
                if (ws.readyState === ws.OPEN) {
                    ws.send(payload);
                }
            } catch (err) {
                logger.debug("Event broadcaster: send failed", {
                    userId: uid,
                    eventType,
                    error: err.message,
                });
            }
        }
    }

    /**
     * Broadcast an event to ALL connected users.
     * Used for Docker-level events (container created/destroyed externally).
     * @param {string} eventType
     * @param {object} [data]
     */
    broadcastToAll(eventType, data = {}) {
        const payload = JSON.stringify({ type: eventType, data });

        for (const [uid, sockets] of this._connections) {
            for (const ws of sockets) {
                try {
                    if (ws.readyState === ws.OPEN) {
                        ws.send(payload);
                    }
                } catch (err) {
                    logger.debug("Event broadcaster: send failed", {
                        userId: uid,
                        eventType,
                        error: err.message,
                    });
                }
            }
        }
    }

    /**
     * Get total active connection count.
     */
    get connectionCount() {
        let count = 0;
        for (const sockets of this._connections.values()) {
            count += sockets.size;
        }
        return count;
    }

    /**
     * Close all connections (shutdown).
     */
    closeAll() {
        for (const [, sockets] of this._connections) {
            for (const ws of sockets) {
                try {
                    ws.close(1001, "Server shutting down");
                } catch (_) {
                    /* ignore */
                }
            }
        }
        this._connections.clear();
    }
}

const eventBroadcaster = new EventBroadcaster();
export default eventBroadcaster;
