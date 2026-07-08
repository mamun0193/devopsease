import logger from "../utils/logger.js";
import globalMetricsCollector from "./globalMetricsCollector.js";
import platformScheduler from "../system/platformScheduler.js";

const CHECK_INTERVAL_MS = 5_000;
const STALE_THRESHOLD_MS = 10_000;

class CollectorWatchdog {
    constructor() {
        this._restartCount = 0;
    }

    start() {
        logger.info("CollectorWatchdog: started (check every 5s, stale threshold 10s)");

        platformScheduler.register(
            "CollectorWatchdog:check",
            () => this._check(),
            CHECK_INTERVAL_MS
        );
    }

    stop() {
        platformScheduler.unregister("CollectorWatchdog:check");
        logger.info("CollectorWatchdog: stopped");
    }

    _check() {
        const stats = globalMetricsCollector.getCollectorStats();

        if (!stats.lastCycleTimestamp) return; // collector hasn't run yet

        const elapsed = Date.now() - stats.lastCycleTimestamp;

        if (elapsed > STALE_THRESHOLD_MS) {
            this._restartCount++;
            logger.warn("CollectorWatchdog: metrics collector stalled", {
                lastCycleMs: stats.lastCycleMs,
                elapsed,
                restartCount: this._restartCount,
            });

            // Attempt restart
            try {
                globalMetricsCollector.restart();
                logger.info("CollectorWatchdog: restart triggered");
            } catch (err) {
                logger.error("CollectorWatchdog: restart failed", { error: err.message });
            }
        }
    }

    getRestartCount() {
        return this._restartCount;
    }
}

export default new CollectorWatchdog();
