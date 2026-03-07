import logger from "../utils/logger.js";

// AlertBroadcaster manages WebSocket connections for alert notifications.
class AlertBroadcaster {
  constructor() {
    /** @type {Map<string, Set<WebSocket>>} */
    this._connections = new Map();
  }

  // Register a new WebSocket connection for a user.
  register(userId, ws) {
    const uid = String(userId);
    if (!this._connections.has(uid)) {
      this._connections.set(uid, new Set());
    }
    this._connections.get(uid).add(ws);

    ws.on("close", () => this.unregister(uid, ws));
    ws.on("error", () => this.unregister(uid, ws));

    logger.debug("Alert broadcaster: client registered", {
      userId: uid,
      total: this._connections.get(uid).size,
    });
  }

  // Unregister a WebSocket connection for a user.
  unregister(userId, ws) {
    const uid = String(userId);
    const sockets = this._connections.get(uid);
    if (!sockets) return;

    sockets.delete(ws);
    if (sockets.size === 0) {
      this._connections.delete(uid);
    }
  }

  // Broadcast an alert to all active WebSocket connections for a user.
  broadcast(userId, alert) {
    const uid = String(userId);
    const sockets = this._connections.get(uid);
    if (!sockets || sockets.size === 0) return;

    const payload = JSON.stringify({ type: "alert", data: alert });

    for (const ws of sockets) {
      try {
        if (ws.readyState === ws.OPEN) {
          ws.send(payload);
        }
      } catch (err) {
        logger.debug("Alert broadcaster: send failed", {
          userId: uid,
          error: err.message,
        });
      }
    }
  }

  // Get the number of active connections (for debugging / observability).
  get connectionCount() {
    let count = 0;
    for (const sockets of this._connections.values()) {
      count += sockets.size;
    }
    return count;
  }

  // Close all connections (e.g. on server shutdown).
  closeAll() {
    for (const [uid, sockets] of this._connections) {
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

const alertBroadcaster = new AlertBroadcaster();
export default alertBroadcaster;
