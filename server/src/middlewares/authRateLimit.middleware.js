import { rateLimitIncr, rateLimitExpire } from '../redis/client.js';
import logger from '../utils/logger.js';
import metricsRegistry from "../observability/metricsRegistry.js";

const AUTH_LIMITS = {
    login: { limit: 10, window: 900 },   // 10 per 15 min
    register: { limit: 5, window: 3600 },  // 5 per hour
    refresh: { limit: 30, window: 900 },   // 30 per 15 min
};

export const authRateLimit = (action) => {
    const config = AUTH_LIMITS[action];
    if (!config) throw new Error(`Unknown auth rate limit action: ${action}`);

    return async (req, res, next) => {
        const ip = req.ip || req.connection?.remoteAddress || 'unknown';
        const key = `authrate:${action}:${ip}`;

        try {
            const count = await rateLimitIncr(key);

            if (count === 1) {
                await rateLimitExpire(key, config.window);
            }

            res.setHeader('X-RateLimit-Limit', config.limit);
            res.setHeader('X-RateLimit-Remaining', Math.max(0, config.limit - count));

            if (count > config.limit) {
                logger.warn(`Auth rate limit hit`, { action, ip, count, limit: config.limit });
                metricsRegistry.increment("rateLimitHits");

                res.setHeader('Retry-After', config.window);
                return res.status(429).json({
                    message: 'Too many attempts. Please try again later.',
                    retryAfter: config.window,
                });
            }

            next();
        } catch (error) {
            // Redis down — fail open for auth (user can still attempt login)
            // but log so we know rate limiting is degraded
            logger.warn('Auth rate limit Redis unavailable, allowing request', {
                action, ip, error: error.message,
            });
            next();
        }
    };
};
