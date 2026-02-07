import logger from "../utils/logger.js";

class SessionManager {
    constructor() {
        this.activeSessions = new Map();
    }

    hasActiveSession(containerId) {
        return this.activeSessions.has(containerId);
    }

    createSession(containerId, sessionData) {
        if (this.hasActiveSession(containerId)) {
            throw new Error(`An exec session is already active for container ${containerId}`);
        }

        const session = {
            containerId,
            startTime: new Date().toISOString(),
            ...sessionData,
        };

        this.activeSessions.set(containerId, session);
        logger.info("Exec session created", { containerId, startTime: session.startTime });
        return session;
    }

    forceCreateSession(containerId, sessionData) {
        let previousSession = null;
        if (this.hasActiveSession(containerId)) {
            previousSession = this.activeSessions.get(containerId);
            this.activeSessions.delete(containerId);
            logger.info("Existing exec session forcibly removed", { containerId });
        }

        const session = {
            containerId,
            startTime: new Date().toISOString(),
            ...sessionData,
        };

        this.activeSessions.set(containerId, session);
        logger.info("Exec session force-created", { containerId, startTime: session.startTime });

        return { session, previousSession };
    }

    getSession(containerId) {
        return this.activeSessions.get(containerId);
    }

    removeSession(containerId) {
        const session = this.activeSessions.get(containerId);
        if (session) {
            this.activeSessions.delete(containerId);
            logger.info("Exec session removed", { containerId });
        }
        return session;
    }

    getAllSessions() {
        return Array.from(this.activeSessions.values());
    }

    cleanup() {
        const sessionCount = this.activeSessions.size;
        this.activeSessions.clear();
        logger.info("All exec sessions cleaned up", { sessionCount });
    }
}

export default new SessionManager();
