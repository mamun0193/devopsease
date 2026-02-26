import AppError from '../utils/AppError.js';

// NOTE: In-memory limiter resets on server restart.
// Not suitable for multi-instance horizontal scaling.
// For production clusters, migrate to Redis-based rate limiting.

const PULL_LIMIT = 10;  // Max pulls per hour per user
const PUSH_LIMIT = 5;   // Max pushes per hour per user
const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_CONCURRENT_PULLS = 2;

// Map<userId, { pulls: { count, windowStart }, pushes: { count, windowStart }, activePulls }>
const userLimits = new Map();

function getUserEntry(userId) {
    const key = userId.toString();
    if (!userLimits.has(key)) {
        userLimits.set(key, {
            pulls: { count: 0, windowStart: Date.now() },
            pushes: { count: 0, windowStart: Date.now() },
            activePulls: 0
        });
    }
    return userLimits.get(key);
}

function checkWindow(bucket) {
    const now = Date.now();
    if (now - bucket.windowStart >= WINDOW_MS) {
        bucket.count = 0;
        bucket.windowStart = now;
    }
}

/**
 * Enforce pull rate limit for a user.
 * Throws 429 if exceeded.
 */
export function enforcePullLimit(userId) {
    const entry = getUserEntry(userId);

    // Check concurrent pulls
    if (entry.activePulls >= MAX_CONCURRENT_PULLS) {
        throw new AppError(
            `Too many concurrent pulls. Maximum ${MAX_CONCURRENT_PULLS} simultaneous pulls allowed.`,
            429,
            'CONCURRENT_PULL_LIMIT'
        );
    }

    // Check hourly rate
    checkWindow(entry.pulls);
    if (entry.pulls.count >= PULL_LIMIT) {
        throw new AppError(
            `Pull rate limit exceeded. Maximum ${PULL_LIMIT} pulls per hour.`,
            429,
            'PULL_RATE_LIMIT'
        );
    }

    entry.pulls.count++;
    entry.activePulls++;
}

/**
 * Release a concurrent pull slot after pull completes (success or failure).
 */
export function releasePullSlot(userId) {
    const key = userId.toString();
    const entry = userLimits.get(key);
    if (entry && entry.activePulls > 0) {
        entry.activePulls--;
    }
}

/**
 * Enforce push rate limit for a user.
 * Throws 429 if exceeded.
 */
export function enforcePushLimit(userId) {
    const entry = getUserEntry(userId);
    checkWindow(entry.pushes);

    if (entry.pushes.count >= PUSH_LIMIT) {
        throw new AppError(
            `Push rate limit exceeded. Maximum ${PUSH_LIMIT} pushes per hour.`,
            429,
            'PUSH_RATE_LIMIT'
        );
    }

    entry.pushes.count++;
}

/**
 * Clear rate limiter entry for a user (e.g., on disconnect).
 * Prevents stale limiter blocking after reconnect.
 */
export function clearUserLimits(userId) {
    userLimits.delete(userId.toString());
}
