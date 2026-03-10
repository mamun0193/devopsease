import ContainerMetric from "../models/containerMetric.model.js";
import logger from "../utils/logger.js";

// Service responsible for periodic aggregation of raw metrics into coarser resolutions and cleanup of old data.

class MetricsAggregator {
  constructor() {
    this._intervals = [];
  }
  // Start the aggregation and cleanup intervals. Called on server startup.
  start() {
    logger.info("MetricsAggregator: starting aggregation pipeline");

    // Backfill legacy records that have no resolution tag
    this._migrateLegacyRecords().catch((err) =>
      logger.warn("MetricsAggregator: legacy migration failed", {
        error: err.message,
      }),
    );

    // 10-minute aggregation — every 10 minutes
    const tenMinInterval = setInterval(
      () => {
        this.aggregate30sTo10m().catch((err) =>
          logger.error("MetricsAggregator: 30s→10m aggregation failed", {
            error: err.message,
          }),
        );
      },
      10 * 60 * 1000,
    );

    // 1-hour aggregation — every hour
    const oneHourAggInterval = setInterval(
      () => {
        this.aggregate10mTo1h().catch((err) =>
          logger.error("MetricsAggregator: 10m→1h aggregation failed", {
            error: err.message,
          }),
        );
      },
      60 * 60 * 1000,
    );

    // Cleanup — every hour
    const cleanupInterval = setInterval(
      () => {
        this.cleanup().catch((err) =>
          logger.error("MetricsAggregator: cleanup failed", {
            error: err.message,
          }),
        );
      },
      60 * 60 * 1000,
    );

    this._intervals.push(tenMinInterval, oneHourAggInterval, cleanupInterval);

    // Run initial aggregation after a short delay (let some data accumulate)
    setTimeout(() => {
      this.aggregate30sTo10m().catch(() => {});
      this.aggregate10mTo1h().catch(() => {});
      this.cleanup().catch(() => {});
    }, 30_000);
  }
  // Stop all intervals to halt the aggregation pipeline. Called on server shutdown.
  stop() {
    for (const id of this._intervals) {
      clearInterval(id);
    }
    this._intervals = [];
    logger.info("MetricsAggregator: stopped");
  }

  // Aggregation: 30s → 10m

  async aggregate30sTo10m() {
    const now = new Date();

    // Current 10-minute boundary (incomplete window — don't process)
    const currentBoundary = new Date(now);
    currentBoundary.setMinutes(Math.floor(now.getMinutes() / 10) * 10, 0, 0);

    // Find the latest 10m record to know where to start
    const latest10m = await ContainerMetric.findOne(
      { resolution: "10m" },
      { timestamp: 1 },
      { sort: { timestamp: -1 } },
    ).lean();

    // Determine processing start point
    let windowStart;
    if (latest10m) {
      // Start from the next 10-minute window after the latest record
      windowStart = new Date(new Date(latest10m.timestamp).getTime());
      windowStart.setMinutes(
        Math.floor(windowStart.getMinutes() / 10) * 10,
        0,
        0,
      );
      windowStart = new Date(windowStart.getTime() + 10 * 60 * 1000);
    } else {
      // No 10m data yet — process from 2 hours ago (max 30s retention)
      windowStart = new Date(now.getTime() - 2 * 60 * 60 * 1000);
      windowStart.setMinutes(
        Math.floor(windowStart.getMinutes() / 10) * 10,
        0,
        0,
      );
    }

    let totalProcessed = 0;

    // Process each 10-minute window up to (but not including) the current one
    while (windowStart.getTime() < currentBoundary.getTime()) {
      const windowEnd = new Date(windowStart.getTime() + 10 * 60 * 1000);

      const results = await ContainerMetric.aggregate([
        {
          $match: {
            resolution: "30s",
            timestamp: { $gte: windowStart, $lt: windowEnd },
          },
        },
        {
          $group: {
            _id: "$containerId",
            cpuAvg: { $avg: "$cpuPercent" },
            cpuMax: { $max: "$cpuPercent" },
            cpuMin: { $min: "$cpuPercent" },
            memoryAvg: { $avg: "$memoryUsedMB" },
            memoryMax: { $max: "$memoryUsedMB" },
            memoryMin: { $min: "$memoryUsedMB" },
            memoryLimitMB: { $last: "$memoryLimitMB" },
            memoryPercent: { $avg: "$memoryPercent" },
            networkRxMB: { $last: "$networkRxMB" },
            networkTxMB: { $last: "$networkTxMB" },
            ownerId: { $first: "$ownerId" },
          },
        },
      ]);

      if (results.length > 0) {
        const docs = results.map((r) => ({
          containerId: r._id,
          resolution: "10m",
          cpuPercent: round(r.cpuAvg),
          cpuAvg: round(r.cpuAvg),
          cpuMax: round(r.cpuMax),
          cpuMin: round(r.cpuMin),
          memoryUsedMB: round(r.memoryAvg),
          memoryAvg: round(r.memoryAvg),
          memoryMax: round(r.memoryMax),
          memoryMin: round(r.memoryMin),
          memoryLimitMB: r.memoryLimitMB,
          memoryPercent: round(r.memoryPercent),
          networkRxMB: r.networkRxMB,
          networkTxMB: r.networkTxMB,
          ownerId: r.ownerId,
          timestamp: windowStart,
        }));

        await ContainerMetric.insertMany(docs);
        totalProcessed += docs.length;
      }

      windowStart = windowEnd;
    }

    if (totalProcessed > 0) {
      logger.info("MetricsAggregator: 30s→10m aggregation complete", {
        records: totalProcessed,
      });
    }
    return totalProcessed;
  }


  // Aggregation: 10m → 1h

  async aggregate10mTo1h() {
    const now = new Date();

    // Current hour boundary (incomplete — don't process)
    const currentBoundary = new Date(now);
    currentBoundary.setMinutes(0, 0, 0);

    // Find the latest 1h record
    const latest1h = await ContainerMetric.findOne(
      { resolution: "1h" },
      { timestamp: 1 },
      { sort: { timestamp: -1 } },
    ).lean();

    let windowStart;
    if (latest1h) {
      windowStart = new Date(new Date(latest1h.timestamp).getTime());
      windowStart.setMinutes(0, 0, 0);
      windowStart = new Date(windowStart.getTime() + 60 * 60 * 1000);
    } else {
      // No 1h data yet — process from 48 hours ago (max 10m retention)
      windowStart = new Date(now.getTime() - 48 * 60 * 60 * 1000);
      windowStart.setMinutes(0, 0, 0);
    }

    let totalProcessed = 0;

    while (windowStart.getTime() < currentBoundary.getTime()) {
      const windowEnd = new Date(windowStart.getTime() + 60 * 60 * 1000);

      const results = await ContainerMetric.aggregate([
        {
          $match: {
            resolution: "10m",
            timestamp: { $gte: windowStart, $lt: windowEnd },
          },
        },
        {
          $group: {
            _id: "$containerId",
            cpuAvg: { $avg: { $ifNull: ["$cpuAvg", "$cpuPercent"] } },
            cpuMax: { $max: { $ifNull: ["$cpuMax", "$cpuPercent"] } },
            cpuMin: { $min: { $ifNull: ["$cpuMin", "$cpuPercent"] } },
            memoryAvg: { $avg: { $ifNull: ["$memoryAvg", "$memoryUsedMB"] } },
            memoryMax: { $max: { $ifNull: ["$memoryMax", "$memoryUsedMB"] } },
            memoryMin: { $min: { $ifNull: ["$memoryMin", "$memoryUsedMB"] } },
            memoryLimitMB: { $last: "$memoryLimitMB" },
            memoryPercent: { $avg: "$memoryPercent" },
            networkRxMB: { $last: "$networkRxMB" },
            networkTxMB: { $last: "$networkTxMB" },
            ownerId: { $first: "$ownerId" },
          },
        },
      ]);

      if (results.length > 0) {
        const docs = results.map((r) => ({
          containerId: r._id,
          resolution: "1h",
          cpuPercent: round(r.cpuAvg),
          cpuAvg: round(r.cpuAvg),
          cpuMax: round(r.cpuMax),
          cpuMin: round(r.cpuMin),
          memoryUsedMB: round(r.memoryAvg),
          memoryAvg: round(r.memoryAvg),
          memoryMax: round(r.memoryMax),
          memoryMin: round(r.memoryMin),
          memoryLimitMB: r.memoryLimitMB,
          memoryPercent: round(r.memoryPercent),
          networkRxMB: r.networkRxMB,
          networkTxMB: r.networkTxMB,
          ownerId: r.ownerId,
          timestamp: windowStart,
        }));

        await ContainerMetric.insertMany(docs);
        totalProcessed += docs.length;
      }

      windowStart = windowEnd;
    }

    if (totalProcessed > 0) {
      logger.info("MetricsAggregator: 10m→1h aggregation complete", {
        records: totalProcessed,
      });
    }
    return totalProcessed;
  }

// Cleanup of old records based on retention policies for each resolution tier.
  async cleanup() {
    const now = Date.now();
    const results = {};

    // 30s metrics → keep 2 hours
    const cutoff30s = new Date(now - 2 * 60 * 60 * 1000);
    const del30s = await ContainerMetric.deleteMany({
      resolution: "30s",
      timestamp: { $lt: cutoff30s },
    });
    results["30s"] = del30s.deletedCount;

    // 10m metrics → keep 48 hours
    const cutoff10m = new Date(now - 48 * 60 * 60 * 1000);
    const del10m = await ContainerMetric.deleteMany({
      resolution: "10m",
      timestamp: { $lt: cutoff10m },
    });
    results["10m"] = del10m.deletedCount;

    // 1h metrics → keep 7 days
    const cutoff1h = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const del1h = await ContainerMetric.deleteMany({
      resolution: "1h",
      timestamp: { $lt: cutoff1h },
    });
    results["1h"] = del1h.deletedCount;

    // Legacy records (no resolution field) → clean after 2 hours
    const legacyCutoff = new Date(now - 2 * 60 * 60 * 1000);
    const delLegacy = await ContainerMetric.deleteMany({
      resolution: { $exists: false },
      timestamp: { $lt: legacyCutoff },
    });
    results.legacy = delLegacy.deletedCount;

    const totalDeleted = Object.values(results).reduce((sum, n) => sum + n, 0);
    if (totalDeleted > 0) {
      logger.info("MetricsAggregator: cleanup complete", results);
    }
    return results;
  }

 // Migration of legacy records that have no resolution field. This is a one-time backfill to tag them as "30s" resolution so they can be properly aggregated and cleaned up. Called on startup.
  async _migrateLegacyRecords() {
    const result = await ContainerMetric.updateMany(
      { resolution: { $exists: false } },
      { $set: { resolution: "30s" } },
    );
    if (result.modifiedCount > 0) {
      logger.info(
        "MetricsAggregator: tagged legacy records with resolution='30s'",
        {
          count: result.modifiedCount,
        },
      );
    }
  }
}

// Helper to round numbers to a specified number of decimal places (default 1). Handles null/undefined/NaN gracefully by returning 0.

function round(value, decimals = 1) {
  if (value == null || isNaN(value)) return 0;
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

export default new MetricsAggregator();
