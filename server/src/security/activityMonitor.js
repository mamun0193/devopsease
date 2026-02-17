import logger from "../utils/logger.js";

class ActivityMonitor {
    constructor() {
        if (ActivityMonitor.instance) {
            return ActivityMonitor.instance;
        }

        this.activityMap = new Map(); // userId -> activityStats
        this.WINDOW_MS = 60000; // 60 seconds

        this.THRESHOLDS = {
            EXEC_COUNT: 10,
            RESTART_COUNT: 5,
            CREATE_COUNT: 5,
        };

        this.WEIGHTS = {
            EXEC: 0.4,
            RESTART: 0.3,
            CREATE: 0.3,
        };

        ActivityMonitor.instance = this;
        logger.info("Activity Monitor initialized (Rolling Window: 60s)");
    }
    //get create stats for a user
    _getUserStats(userId) {
        if (!this.activityMap.has(userId)) {
            this.activityMap.set(userId, {
                execTimestamps: [],
                restartTimestamps: [],
                containerCreateTimestamps: [],
                anomalyScore: 0,
                isSuspicious: false,
            });
        }
        return this.activityMap.get(userId);
    }

    //prune old timestamps and update scores

    _updateUser(userId) {
        const stats = this.activityMap.get(userId);
        if (!stats) return;

        const now = Date.now();
        const cutoff = now - this.WINDOW_MS;

        // Prune old timestamps
        stats.execTimestamps = stats.execTimestamps.filter((t) => t > cutoff);
        stats.restartTimestamps = stats.restartTimestamps.filter((t) => t > cutoff);
        stats.containerCreateTimestamps = stats.containerCreateTimestamps.filter((t) => t > cutoff);

        // Calculate Counts
        const execCount = stats.execTimestamps.length;
        const restartCount = stats.restartTimestamps.length;
        const createCount = stats.containerCreateTimestamps.length;

        // Calculate Score
        let score = 0;
        if (execCount > 0) score += (execCount / this.THRESHOLDS.EXEC_COUNT) * this.WEIGHTS.EXEC;
        if (restartCount > 0) score += (restartCount / this.THRESHOLDS.RESTART_COUNT) * this.WEIGHTS.RESTART;
        if (createCount > 0) score += (createCount / this.THRESHOLDS.CREATE_COUNT) * this.WEIGHTS.CREATE;

        // Clamp score to 1.0
        stats.anomalyScore = Math.min(1.0, score);
        stats.isSuspicious = stats.anomalyScore >= 0.7;

        // Cleanup empty users to prevent memory leaks
        if (
            execCount === 0 &&
            restartCount === 0 &&
            createCount === 0 &&
            stats.anomalyScore === 0
        ) {
            this.activityMap.delete(userId);
        }
    }

    recordExec(userId) {
        if (!userId) return;
        const stats = this._getUserStats(userId);
        stats.execTimestamps.push(Date.now());
        this._updateUser(userId);
    }

    recordRestart(userId) {
        if (!userId) return;
        const stats = this._getUserStats(userId);
        stats.restartTimestamps.push(Date.now());
        this._updateUser(userId);
    }

    recordContainerCreate(userId) {
        if (!userId) return;
        const stats = this._getUserStats(userId);
        stats.containerCreateTimestamps.push(Date.now());
        this._updateUser(userId);
    }

    getSuspiciousUsers() {
        const suspicious = [];
        const now = Date.now();
        const cutoff = now - this.WINDOW_MS;

        for (const [userId, stats] of this.activityMap.entries()) {
            this._updateUser(userId);
            // Check if still exists after prune
            if (this.activityMap.has(userId)) {
                const updatedStats = this.activityMap.get(userId);
                if (updatedStats.anomalyScore > 0) {
                    suspicious.push({
                        userId,
                        anomalyScore: updatedStats.anomalyScore,
                        isSuspicious: updatedStats.isSuspicious,
                        execCountLastMinute: updatedStats.execTimestamps.length,
                        restartCountLastMinute: updatedStats.restartTimestamps.length,
                        containerCreateCountLastMinute: updatedStats.containerCreateTimestamps.length
                    });
                }
            }
        }

        return suspicious.sort((a, b) => b.anomalyScore - a.anomalyScore);
    }
}

const activityMonitor = new ActivityMonitor();
export default activityMonitor;
