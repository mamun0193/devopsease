import {
    isRedisConnected,
    safeGet,
    safeSet,
    safeDel,
    safeKeys,
} from "./client.js";
import logger from "../utils/logger.js";

// Resilient cache service: cache-aside, deduplication, non-blocking, fail-safe
class CacheService {
    constructor() {
        // Track in-flight requests to prevent duplicate fetches
        this.pendingRequests = new Map();
    }

    // Get cached value or fetch from source (check cache -> return if hit -> fetch if miss -> cache result)
    async getOrFetch(key, fetchFn, ttlSeconds) {
        // 1. Try cache first (if Redis available)
        if (isRedisConnected()) {
            try {
                const cached = await safeGet(key);
                if (cached) {
                    logger.debug("Cache hit", { key });
                    return JSON.parse(cached);
                }
                logger.debug("Cache miss", { key });
            } catch (parseError) {
                // Invalid JSON in cache - ignore and fetch fresh
                logger.warn("Cache parse error, fetching fresh", {
                    key,
                    error: parseError.message,
                });
            }
        }

        // 2. Fetch with deduplication (always, regardless of Redis state)
        const data = await this.fetchWithDedup(key, fetchFn);

        // 3. Cache result (non-blocking, fire-and-forget)
        if (isRedisConnected()) {
            try {
                safeSet(key, JSON.stringify(data), ttlSeconds);
            } catch (serializeError) {
                logger.warn("Failed to serialize data for cache", {
                    key,
                    error: serializeError.message,
                });
            }
        }

        return data;
    }

    // Fetch with request deduplication - Prevents concurrent duplicate requests
    async fetchWithDedup(key, fetchFn) {
        // Check if request already in flight
        if (this.pendingRequests.has(key)) {
            logger.debug("Request already in flight, waiting", { key });
            return this.pendingRequests.get(key);
        }

        // Create promise with guaranteed cleanup
        const promise = (async () => {
            try {
                return await fetchFn();
            } finally {
                // ALWAYS clean up, even on error
                this.pendingRequests.delete(key);
            }
        })();

        this.pendingRequests.set(key, promise);
        return promise;
    }

    // Get cached value without fetching - Returns null if not cached/unavailable
    async get(key) {
        if (!isRedisConnected()) return null;

        try {
            const cached = await safeGet(key);
            return cached ? JSON.parse(cached) : null;
        } catch (error) {
            logger.warn("Cache get failed", { key, error: error.message });
            return null;
        }
    }

    // Set cached value (non-blocking) - Silently fails if Redis unavailable
    set(key, value, ttlSeconds) {
        if (!isRedisConnected()) return;

        try {
            safeSet(key, JSON.stringify(value), ttlSeconds);
        } catch (error) {
            logger.warn("Cache set failed", { key, error: error.message });
        }
    }

    // Invalidate cache entries matching a pattern - Non-blocking, matches e.g. "container:abc123:*"
    async invalidate(pattern) {
        if (!isRedisConnected()) return;

        try {
            const keys = await safeKeys(pattern);
            if (keys.length > 0) {
                safeDel(...keys);
                logger.debug("Cache invalidated", { pattern, keysDeleted: keys.length });
            }
        } catch (error) {
            logger.warn("Cache invalidation failed", {
                pattern,
                error: error.message,
            });
        }
    }

    // Invalidate a single key (non-blocking)
    del(key) {
        if (!isRedisConnected()) return;
        safeDel(key);
        logger.debug("Cache key deleted", { key });
    }

    // Clear all pending requests (useful for cleanup/testing)
    clearPending() {
        this.pendingRequests.clear();
    }

    // Get cache status for debugging
    getStatus() {
        return {
            redisAvailable: isRedisConnected(),
            pendingRequests: this.pendingRequests.size,
        };
    }
}

// Singleton instance
const cacheService = new CacheService();

export default cacheService;
