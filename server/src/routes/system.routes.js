import express from "express";
import globalMetricsCollector from "../services/globalMetricsCollector.js";
import collectorWatchdog from "../services/collectorWatchdog.service.js";
import { getSubscriberCount } from "../websocket/metricsStreamer.js";
import { isRedisConnected } from "../redis/client.js";
import metricsAggregator from "../services/metricsAggregator.service.js";
import authMiddleware from "../middlewares/auth.middleware.js";
import { requireRole, ROLES } from "../middlewares/rbac.js";
import { getBlueprint } from "../controllers/blueprint.controller.js";

const router = express.Router();

// GET /system/metrics — internal system observability (admin only)
router.get("/metrics", authMiddleware, requireRole(ROLES.ADMIN), (req, res) => {
    const collectorStats = globalMetricsCollector.getCollectorStats();

    res.status(200).json({
        success: true,
        data: {
            containersTracked: collectorStats.containersTracked,
            metricsCacheSize: collectorStats.containersTracked,
            collectorCycleMs: collectorStats.lastCycleMs,
            lastCycleTimestamp: collectorStats.lastCycleTimestamp,
            isLeader: collectorStats.isLeader,
            wsSubscribers: getSubscriberCount(),
            redisConnected: isRedisConnected(),
            watchdogRestarts: collectorWatchdog.getRestartCount(),
            aggregationRunning: metricsAggregator.isRunning?.() ?? true,
        },
    });
});

// GET /system/blueprint/:repoId — generate deployment blueprint
router.get("/blueprint/:repoId", authMiddleware, getBlueprint);

export default router;
