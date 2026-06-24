import Redis from "ioredis";
import logger from "../utils/logger.js";

const REDIS_HOST = process.env.REDIS_HOST || "localhost";
const REDIS_PORT = parseInt(process.env.REDIS_PORT || "6379", 10);
const REDIS_ENABLED = process.env.REDIS_ENABLED !== "false";

let redis = null;
let isRedisAvailable = false;

// Initialize Redis client with resilient connection handling (Redis is optional)
function createRedisClient() {
    if (!REDIS_ENABLED) {
        logger.info("Redis is explicitly disabled via REDIS_ENABLED=false");
        return null; // Return dummy client or null since isRedisConnected will be false
    }

    const client = new Redis({
        host: REDIS_HOST,
        port: REDIS_PORT,
        retryStrategy: (times) => {
            // Exponential backoff with max 30 second delay
            const delay = Math.min(times * 500, 30000);
            logger.warn(`Redis reconnecting in ${delay}ms (attempt ${times})`);
            return delay;
        },
        maxRetriesPerRequest: 1, // Fail fast on individual requests
        enableReadyCheck: true,
        lazyConnect: true,
        // Don't throw errors on connection failure
        enableOfflineQueue: false,
        // Reconnect automatically
        reconnectOnError: () => true,
    });

    // Connection state tracking
    client.on("connect", () => {
        // Redis connecting (verbose log suppressed)
    });

    client.on("ready", () => {
        isRedisAvailable = true;
        isRedisAvailable = true;
    });

    client.on("error", (err) => {
        // Log as warning, not error - Redis is optional
        logger.warn("Redis error (caching disabled)", { error: err.message });
        isRedisAvailable = false;
    });

    client.on("close", () => {
        logger.warn("Redis connection closed");
        isRedisAvailable = false;
    });

    client.on("reconnecting", () => {
        // Redis reconnecting
        isRedisAvailable = false;
    });

    client.on("end", () => {
        // Redis ended
        isRedisAvailable = false;
    });

    return client;
}

// Get Redis client instance (lazy initialization)
export function getRedisClient() {
    if (!redis) {
        redis = createRedisClient();
    }
    return redis;
}

// Check if Redis is currently available - Primary check before any cache operations
export function isRedisConnected() {
    return isRedisAvailable && redis?.status === "ready";
}

// Attempt to connect to Redis (non-blocking, failure-tolerant) - Returns true if connected
export async function connectRedis() {
    if (!REDIS_ENABLED) {
        isRedisAvailable = false;
        return false;
    }
    const client = getRedisClient();
    if (!client) return false;
    
    try {
        await client.connect();
        // Small delay to allow ready event to fire
        await new Promise((resolve) => setTimeout(resolve, 100));
        return isRedisAvailable;
    } catch (error) {
        // Connection failure is expected when Redis is not available
        logger.warn("Redis connection failed - running without cache", {
            error: error.message,
        });
        isRedisAvailable = false;
        return false;
    }
}

// Safe Redis GET operation - Returns null on error, never throws
export async function safeGet(key) {
    if (!isRedisConnected()) return null;

    try {
        const value = await redis.get(key);
        return value;
    } catch (error) {
        logger.warn("Redis GET failed, bypassing cache", {
            key,
            error: error.message,
        });
        return null;
    }
}

// Safe Redis SET operation (fire-and-forget) - Never blocks/throws
export function safeSet(key, value, ttlSeconds) {
    if (!isRedisConnected()) return;

    // Fire and forget - don't await
    redis.setex(key, ttlSeconds, value).catch((error) => {
        logger.warn("Redis SET failed (non-blocking)", {
            key,
            error: error.message,
        });
    });
}

// Safe Redis DEL operation (fire-and-forget)
export function safeDel(...keys) {
    if (!isRedisConnected()) return;

    redis.del(...keys).catch((error) => {
        logger.warn("Redis DEL failed (non-blocking)", {
            keys,
            error: error.message,
        });
    });
}

// Safe Redis KEYS operation - Returns empty array on error
export async function safeKeys(pattern) {
    if (!isRedisConnected()) return [];

    try {
        return await redis.keys(pattern);
    } catch (error) {
        logger.warn("Redis KEYS failed", { pattern, error: error.message });
        return [];
    }
}

// Safe Redis LPUSH operation (fire-and-forget)
export function safeLpush(key, value) {
    if (!isRedisConnected()) return;

    redis.lpush(key, value).catch((error) => {
        logger.warn("Redis LPUSH failed (non-blocking)", {
            key,
            error: error.message,
        });
    });
}

// Safe Redis LTRIM operation (fire-and-forget)
export function safeLtrim(key, start, stop) {
    if (!isRedisConnected()) return;

    redis.ltrim(key, start, stop).catch((error) => {
        logger.warn("Redis LTRIM failed (non-blocking)", {
            key,
            error: error.message,
        });
    });
}

// Safe Redis LRANGE operation - Returns empty array on error
export async function safeLrange(key, start, stop) {
    if (!isRedisConnected()) return [];

    try {
        return await redis.lrange(key, start, stop);
    } catch (error) {
        logger.warn("Redis LRANGE failed", { key, error: error.message });
        return [];
    }
}

// Rate Limiting Operations - THROW if Redis unavailable (Fail-Closed)
export async function rateLimitIncr(key) {
    if (!REDIS_ENABLED) return 1; // Bypass rate limiting if explicitly disabled
    
    if (!isRedisConnected()) {
        const connected = await connectRedis(); // Try one last reconnect
        if (!connected) throw new Error("Redis unavailable for rate limiting");
    }
    try {
        return await redis.incr(key);
    } catch (error) {
        throw new Error(`Redis INCR failed: ${error.message}`);
    }
}

export async function rateLimitExpire(key, ttlSeconds) {
    if (!REDIS_ENABLED) return true; // Bypass rate limiting if explicitly disabled
    
    if (!isRedisConnected()) {
        // Optimistic check, but likely already checked by INCR/caller
        if (!await connectRedis()) throw new Error("Redis unavailable");
    }
    try {
        return await redis.expire(key, ttlSeconds);
    } catch (error) {
        throw new Error(`Redis EXPIRE failed: ${error.message}`);
    }
}

// Gracefully disconnect from Redis
export async function disconnectRedis() {
    if (redis) {
        try {
            await redis.quit();
        } catch (error) {
            // Ignore disconnect errors
            logger.warn("Redis disconnect error (ignored)", { error: error.message });
        }
        redis = null;
        isRedisAvailable = false;
        logger.info("Redis disconnected");
    }
}

export default getRedisClient;
