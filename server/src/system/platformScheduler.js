import logger from '../utils/logger.js';
import { getRedisClient, isRedisConnected } from '../redis/client.js';

/**
 * PlatformScheduler
 * 
 * Centralized scheduler for all recurring platform jobs.
 * All background work (TTL expiry, tunnel cleanup, future cost intelligence, etc.)
 * should be registered here instead of using standalone timers.
 */

class PlatformScheduler {
  constructor() {
    this._jobs = new Map();
  }

  // Register a recurring job.
  register(name, handler, intervalMs) {
    if (this._jobs.has(name)) {
      logger.info(`[PlatformScheduler] Job "${name}" is already registered`);
      return;
    }

    const jobMeta = {
      intervalId: null,
      handler,
      intervalMs,
      lastRun: null,
      runCount: 0,
      running: false,
      lastDurationMs: null,
      errorCount: 0,
      consecutiveErrors: 0,
      lastError: null,
      lastErrorAt: null,
      retryCount: 0
    };

    jobMeta.intervalId = setInterval(async () => {
      // Prevent overlapping execution in the same process
      if (jobMeta.running) {
        logger.warn(`[PlatformScheduler] Job "${name}" skipped — previous execution still running`);
        return;
      }

      jobMeta.running = true;
      let lockAcquired = false;
      const redis = getRedisClient();
      const lockKey = `platform:scheduler:lock:${name}`;

      try {
        if (isRedisConnected()) {
          // Attempt to acquire distributed lock for (intervalMs - 1s) to prevent double execution across nodes
          const lockDuration = Math.max(intervalMs - 1000, 1000);
          const lock = await redis.set(lockKey, 'LOCKED', 'NX', 'PX', lockDuration);
          if (!lock) {
             logger.debug(`[PlatformScheduler] Job "${name}" skipped — lock acquired by another instance`);
             return; // Skip execution
          }
          lockAcquired = true;
        }

        const startTime = Date.now();
        await handler();
        jobMeta.lastRun = new Date();
        jobMeta.runCount += 1;
        jobMeta.lastDurationMs = Date.now() - startTime;
        jobMeta.consecutiveErrors = 0; // reset on success
      } catch (err) {
        jobMeta.errorCount += 1;
        jobMeta.consecutiveErrors += 1;
        jobMeta.lastError = err.message;
        jobMeta.lastErrorAt = new Date();
        jobMeta.lastDurationMs = jobMeta.lastDurationMs || 0; // fallback if failed before start
        logger.error(`[PlatformScheduler] Job "${name}" failed`, { 
            error: err.message,
            consecutiveErrors: jobMeta.consecutiveErrors,
            totalErrors: jobMeta.errorCount
        });
      } finally {
        jobMeta.running = false;
        // We intentionally do NOT release the lock early. The lock acts as a natural debounce
        // ensuring no other node executes the job during the interval window even if this node finishes early.
      }
    }, intervalMs);

    this._jobs.set(name, jobMeta);
    logger.info(`[PlatformScheduler] Registered job "${name}"`, { intervalMs });
  }

  unregister(name) {
    const job = this._jobs.get(name);
    if (job) {
        clearInterval(job.intervalId);
        this._jobs.delete(name);
        logger.info(`[PlatformScheduler] Unregistered job "${name}"`);
    }
  }

  getStatus() {
    return [...this._jobs.entries()].map(([name, job]) => ({
      name,
      intervalMs: job.intervalMs,
      lastRun: job.lastRun,
      runCount: job.runCount,
      running: job.running,
      lastDurationMs: job.lastDurationMs,
      errorCount: job.errorCount,
      consecutiveErrors: job.consecutiveErrors,
      lastError: job.lastError,
      lastErrorAt: job.lastErrorAt,
      retryCount: job.retryCount
    }));
  }

  stopAll() {
    for (const [name] of this._jobs) {
        this.unregister(name);
    }
  }
}

export default new PlatformScheduler();
