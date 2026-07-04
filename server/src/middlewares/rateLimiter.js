import { rateLimitIncr, rateLimitExpire } from '../redis/client.js';
import AppError from '../utils/AppError.js';
import logger from '../utils/logger.js';

/**
 * Express middleware for Redis-backed rate limiting.
 * @param {Object} options 
 * @param {number} options.windowMs - Time window in milliseconds (e.g. 60000 for 1m)
 * @param {number} options.max - Max requests per window
 * @param {string} options.keyPrefix - Prefix for Redis key
 * @returns {Function} Express middleware function
 */
export const rateLimiter = ({ windowMs = 60000, max = 10, keyPrefix = 'rate-limit' }) => {
    return async (req, res, next) => {
        try {
            const clientIp = req.ip || req.connection.remoteAddress;
            const userId = req.user ? (req.user.userId || req.user._id) : 'anonymous';
            const key = `${keyPrefix}:${userId}:${clientIp}`;

            // Increment the counter
            const currentRequests = await rateLimitIncr(key);
            
            if (currentRequests === 1) {
                // First request in window, set expiry
                await rateLimitExpire(key, Math.ceil(windowMs / 1000));
            }

            // Set standard rate limit headers
            res.set('X-RateLimit-Limit', max);
            res.set('X-RateLimit-Remaining', Math.max(0, max - currentRequests));

            if (currentRequests > max) {
                return next(new AppError('Too many requests, please try again later.', 429));
            }

            next();
        } catch (error) {
            logger.warn(`Rate limiter error, bypassing: ${error.message}`);
            // Fail open to avoid blocking legitimate traffic if Redis is down
            next();
        }
    };
};

export default rateLimiter;
