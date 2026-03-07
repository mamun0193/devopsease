import mongoose from "mongoose";

export const ALERT_TYPES = Object.freeze({
  CRASH: "CRASH",
  CRASH_LOOP: "CRASH_LOOP",
  OOM: "OOM",
  HIGH_CPU: "HIGH_CPU",
  HIGH_MEMORY: "HIGH_MEMORY",
  QUOTA_WARNING: "QUOTA_WARNING",
  HEALTH_DEGRADED: "HEALTH_DEGRADED",
  HEALTH_UNHEALTHY: "HEALTH_UNHEALTHY",
});

export const ALERT_SEVERITIES = Object.freeze({
  INFO: "INFO",
  WARNING: "WARNING",
  CRITICAL: "CRITICAL",
});

const alertSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    containerId: {
      type: String,
      default: null,
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(ALERT_TYPES),
      required: true,
    },
    severity: {
      type: String,
      enum: Object.values(ALERT_SEVERITIES),
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    resolved: {
      type: Boolean,
      default: false,
      index: true,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for common queries
alertSchema.index({ userId: 1, resolved: 1, createdAt: -1 });
alertSchema.index({ userId: 1, containerId: 1, type: 1, resolved: 1 });

// TTL: auto-delete resolved alerts after 7 days
alertSchema.index(
  { resolvedAt: 1 },
  { expireAfterSeconds: 7 * 24 * 60 * 60, partialFilterExpression: { resolved: true } }
);

const Alert = mongoose.model("Alert", alertSchema);

export default Alert;
