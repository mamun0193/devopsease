import { rateLimitIncr, rateLimitExpire } from '../redis/client.js';
import { PLANS, DEFAULT_PLAN } from '../config/plans.js';
import AppError from '../utils/AppError.js';
import logger from '../utils/logger.js';

/**
 * Core logic for rate limiting.
 * Can be used by Middleware (HTTP) and WebSockets.
 */
export const enforceRateLimit = async (userId, userPlan, actionType) => {
    const planConfig = PLANS[userPlan] || PLANS[DEFAULT_PLAN];
    const limitConfig = planConfig.rateLimits[actionType];

    if (!limitConfig) {
        // If no limit defined for this action, allow it
        return null;
    }

    const { limit, window } = limitConfig;
    const key = `rate:${userId}:${actionType}`;

    // 1. Increment counter (Fail-Closed: throws if Redis down)
    let currentCount;
    // NOTE: INCR + EXPIRE is acceptable for Day 34.
    // Can be replaced with Lua script later for atomicity.
    try {
        currentCount = await rateLimitIncr(key);
    } catch (error) {
        logger.error('Rate limit Redis failure', { error: error.message });
        throw new AppError("Rate limiting unavailable. Please try again later.", 503);
    }

    // 2. Set expiration on first increment
    if (currentCount === 1) {
        try {
            await rateLimitExpire(key, window);
        } catch (error) {
            // If expire fails, key needs to be managed or it might persist.
            // We log error and return 503 to maintain fail-closed safety.
            logger.error('Rate limit Redis expire failure', { error: error.message });
            throw new AppError("Rate limiting unavailable. Please try again later.", 503);
        }
    }

    // 3. Check limit
    if (currentCount > limit) {
        logger.warn(`Rate limit exceeded for user ${userId} on ${actionType}`, { count: currentCount, limit });
        const error = new AppError("Rate limit exceeded", 429);
        error.retryAfter = window;
        throw error;
    }

    return { limit, currentCount, window };
};

/**
 * Middleware factory for Redis-backed rate limiting.
 * Enforces limits based on user plan.
 * Fails closed (503) if Redis is unavailable.
 * 
 * @param {string} actionType - 'create', 'exec', or 'destructive'
 */
export const rateLimiter = (actionType) => {
    return async (req, res, next) => {
        try {
            const userId = req.user?._id || req.user?.userId;
            const userPlan = req.user?.plan || DEFAULT_PLAN;

            const result = await enforceRateLimit(userId, userPlan, actionType);

            if (result) {
                // Add headers for visibility
                res.setHeader('X-RateLimit-Limit', result.limit);
                res.setHeader('X-RateLimit-Remaining', Math.max(0, result.limit - result.currentCount));
            }

            next();

        } catch (error) {
            if (error.statusCode === 429 && error.retryAfter) {
                res.setHeader('Retry-After', error.retryAfter);
            }
            next(error);
        }
    };
};
