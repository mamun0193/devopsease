import logger from '../utils/logger.js';

class PlatformScheduler {
  constructor() {
    this._jobs = new Map(); // name → { intervalId, handler, intervalMs, lastRun }
  }

  register(name, handler, intervalMs) {
    if (this._jobs.has(name)) {
      logger.info(`[PlatformScheduler] Job "${name}" is already registered`);
      return;
    }

    const id = setInterval(async () => {
      try {
        await handler();
        const job = this._jobs.get(name);
        if (job) job.lastRun = new Date();
      } catch (err) {
        logger.error(`[PlatformScheduler] Job "${name}" failed`, { error: err.message });
      }
    }, intervalMs);

    this._jobs.set(name, { intervalId: id, handler, intervalMs, lastRun: null });
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
      lastRun: job.lastRun
    }));
  }

  stopAll() {
    for (const [name] of this._jobs) {
        this.unregister(name);
    }
  }
}

export default new PlatformScheduler();
