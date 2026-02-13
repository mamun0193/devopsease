import express from "express";
import metricsRegistry from "../observability/metricsRegistry.js";
import { requireRole } from "../middlewares/rbac.js";
import { ROLES } from "../config/permissions.js";
import { rateLimitIncr, rateLimitExpire } from "../redis/client.js";
import logger from "../utils/logger.js";
import authenticate from "../middlewares/auth.middleware.js";

const router = express.Router();

const METRICS_LIMIT = 20;
const METRICS_WINDOW = 60; // 1 minute

// Lightweight rate limiter specific to metrics endpoint
const metricsRateLimit = async (req, res, next) => {
    const ip = req.ip || req.connection?.remoteAddress || "unknown";
    const key = `rate:metrics:${ip}`;

    try {
        const count = await rateLimitIncr(key);
        if (count === 1) {
            await rateLimitExpire(key, METRICS_WINDOW);
        }

        res.setHeader("X-RateLimit-Limit", METRICS_LIMIT);
        res.setHeader("X-RateLimit-Remaining", Math.max(0, METRICS_LIMIT - count));

        if (count > METRICS_LIMIT) {
            logger.warn("Metrics endpoint rate limit exceeded", { ip });
            return res.status(429).json({
                message: "Too many metrics requests. Please try again later."
            });
        }
        next();
    } catch (error) {
        // If Redis fails, allow the request but log it (fail open for admin observability)
        logger.warn("Metrics rate limit unavailable", { error: error.message });
        next();
    }
};

// Rate limit middleware applied above imports for hoisting, but router defined here

router.get("/",
    authenticate,
    requireRole(ROLES.ADMIN),
    metricsRateLimit,
    (req, res) => {
        const metrics = {
            ...metricsRegistry.getMetrics(),
            uptimeSeconds: metricsRegistry.getUptimeSeconds(),
            timestamp: new Date().toISOString(),
        };
        res.json(metrics);
    }
);

export default router;
