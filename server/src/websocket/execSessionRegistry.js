import { randomUUID } from "crypto";
import logger from "../utils/logger.js";
import metricsRegistry from "../observability/metricsRegistry.js";

const IDLE_TIMEOUT_MS = parseInt(process.env.EXEC_IDLE_TIMEOUT_MS, 10) || 300000;

class ExecSessionRegistry {
    constructor() {
        this.sessions = new Map();
    }

    createSession({ containerId, userId, ws }) {
        const sessionId = randomUUID();
        const now = Date.now();

        const session = {
            sessionId,
            containerId,
            userId,
            startedAt: now,
            lastIOAt: now,
            status: "active",
            ws,
            dockerStream: null,
            dockerExecInstance: null,
            idleTimeoutRef: null,
        };

        this.sessions.set(sessionId, session);
        metricsRegistry.increment("activeExecSessions");
        this._startIdleTimer(sessionId);

        logger.info("Exec session created", { sessionId, containerId, userId });
        return session;
    }

    updateLastIO(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session || session.status !== "active") return;

        session.lastIOAt = Date.now();
        this._startIdleTimer(sessionId);
    }

    async terminateSession(sessionId, reason = "manual_termination") {
        const session = this.sessions.get(sessionId);
        if (!session) return;
        if (session.status === "terminating" || session.status === "closed") return;

        session.status = "terminating";
        logger.info("Terminating exec session", { sessionId, reason, containerId: session.containerId });

        this._sendTermination(session, reason);
        await this._cleanupSession(sessionId, reason);
    }

    async forceKillSession(sessionId, reason = "force_kill") {
        const session = this.sessions.get(sessionId);
        if (!session) return;
        if (session.status === "closed") return;

        session.status = "terminating";
        logger.info("Force killing exec session", { sessionId, reason, containerId: session.containerId });

        this._sendTermination(session, reason);
        await this._cleanupSession(sessionId, reason);
    }

    async _cleanupSession(sessionId, reason) {
        const session = this.sessions.get(sessionId);
        if (!session) return;
        if (session.status === "closed") return;

        // Clear idle timer
        if (session.idleTimeoutRef) {
            clearTimeout(session.idleTimeoutRef);
            session.idleTimeoutRef = null;
        }

        // Destroy Docker stream
        if (session.dockerStream) {
            try {
                session.dockerStream.destroy();
            } catch (err) {
                logger.debug("Error destroying docker stream", { sessionId, error: err.message });
            }
            session.dockerStream = null;
        }

        // Close WebSocket
        if (session.ws) {
            try {
                if (session.ws.readyState === session.ws.OPEN) {
                    session.ws.close();
                }
            } catch (err) {
                logger.debug("Error closing WebSocket", { sessionId, error: err.message });
            }
            session.ws = null;
        }

        // Transition to closed and decrement metrics
        session.status = "closed";
        metricsRegistry.decrement("activeExecSessions");

        this.sessions.delete(sessionId);
        logger.info("Exec session cleaned up", { sessionId, reason, containerId: session.containerId });
    }

    async terminateAllSessions(reason = "server_shutdown") {
        const sessionIds = Array.from(this.sessions.keys());
        logger.info("Terminating all exec sessions", { count: sessionIds.length, reason });

        const promises = sessionIds.map((id) => this.forceKillSession(id, reason));
        await Promise.allSettled(promises);

        logger.info("All exec sessions terminated", { reason });
    }

    getSession(sessionId) {
        return this.sessions.get(sessionId) || null;
    }

    getActiveSessions() {
        return Array.from(this.sessions.values()).filter((s) => s.status === "active");
    }

    getSessionsByContainer(containerId) {
        return Array.from(this.sessions.values()).filter(
            (s) => s.containerId === containerId && s.status !== "closed"
        );
    }

    _startIdleTimer(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session || session.status !== "active") return;

        if (session.idleTimeoutRef) {
            clearTimeout(session.idleTimeoutRef);
        }

        session.idleTimeoutRef = setTimeout(() => {
            logger.warn("Exec session idle timeout", { sessionId, containerId: session.containerId });
            this.terminateSession(sessionId, "idle_timeout").catch((err) => {
                logger.error("Error during idle timeout termination", { sessionId, error: err.message });
            });
        }, IDLE_TIMEOUT_MS);

        // Prevent timer from keeping the process alive during shutdown
        if (session.idleTimeoutRef.unref) {
            session.idleTimeoutRef.unref();
        }
    }

    _sendTermination(session, reason) {
        if (!session.ws) return;
        try {
            if (session.ws.readyState === session.ws.OPEN) {
                session.ws.send(JSON.stringify({
                    type: "session_terminated",
                    reason,
                    message: this._getReasonMessage(reason),
                }));
            }
        } catch (err) {
            logger.debug("Error sending termination message", { sessionId: session.sessionId, error: err.message });
        }
    }

    _getReasonMessage(reason) {
        const messages = {
            idle_timeout: "Session terminated due to inactivity",
            container_stopped: "Container was stopped",
            container_removed: "Container was removed",
            container_paused: "Container was paused",
            container_restarted: "Container was restarted",
            server_shutdown: "Server is shutting down",
            manual_termination: "Session terminated by user",
            force_kill: "Session forcefully terminated",
        };
        return messages[reason] || `Session terminated: ${reason}`;
    }
}

const execSessionRegistry = new ExecSessionRegistry();
export default execSessionRegistry;
