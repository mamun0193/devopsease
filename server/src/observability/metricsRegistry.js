import logger from "../utils/logger.js";

const ALLOWED_METRICS = Object.freeze([
    "activeWebSockets",
    "activeExecSessions",
    "tokenRefreshCount",
    "failedLogins",
    "rateLimitHits",
]);

class MetricsRegistry {
    constructor() {
        this.metrics = {};
        ALLOWED_METRICS.forEach((metric) => {
            this.metrics[metric] = 0;
        });
        this.serverStartedAt = Date.now();
    }

    // Guard against invalid metric names
    _validateMetric(metric) {
        if (!ALLOWED_METRICS.includes(metric)) {
            logger.error(`Attempted to modify unknown metric: ${metric}`);
            return false;
        }
        return true;
    }

    increment(metric) {
        if (!this._validateMetric(metric)) return;
        this.metrics[metric]++;
    }

    decrement(metric) {
        if (!this._validateMetric(metric)) return;
        if (this.metrics[metric] > 0) {
            this.metrics[metric]--;
        } else {
            logger.warn(`Attempted to decrement metric below 0: ${metric}`);
        }
    }

    getMetrics() {
        return { ...this.metrics };
    }

    getUptimeSeconds() {
        return Math.floor((Date.now() - this.serverStartedAt) / 1000);
    }

    getHealthSnapshot() {
        return {
            uptime: this.getUptimeSeconds(),
            activeSessions: {
                webSockets: this.metrics.activeWebSockets,
                exec: this.metrics.activeExecSessions,
            },
        };
    }
}

// Singleton instance
const metricsRegistry = new MetricsRegistry();
export default metricsRegistry;
