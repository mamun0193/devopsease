import mongoose from "mongoose";

export const ALERT_TYPES = Object.freeze({
  // Container alerts (existing)
  CRASH: "CRASH",
  CRASH_LOOP: "CRASH_LOOP",
  OOM: "OOM",
  HIGH_CPU: "HIGH_CPU",
  HIGH_MEMORY: "HIGH_MEMORY",
  QUOTA_WARNING: "QUOTA_WARNING",
  HEALTH_DEGRADED: "HEALTH_DEGRADED",
  HEALTH_UNHEALTHY: "HEALTH_UNHEALTHY",
  // Platform-wide alerts
  BUILD_FAILED: "BUILD_FAILED",
  DEPLOYMENT_FAILED: "DEPLOYMENT_FAILED",
  DOMAIN_UNHEALTHY: "DOMAIN_UNHEALTHY",
  CERTIFICATE_EXPIRING: "CERTIFICATE_EXPIRING",
  CERTIFICATE_EXPIRED: "CERTIFICATE_EXPIRED",
  PIPELINE_FAILED: "PIPELINE_FAILED",
  GATEWAY_ERROR_SPIKE: "GATEWAY_ERROR_SPIKE",
  GATEWAY_LATENCY_HIGH: "GATEWAY_LATENCY_HIGH",
  SCHEDULER_FAILURE: "SCHEDULER_FAILURE",
  PLATFORM_DEGRADED: "PLATFORM_DEGRADED",
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
      default: null, // null for platform-wide alerts
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
    // Platform correlation fields
    domain: {
      type: String,
      default: null,
    },
    correlationId: {
      type: String,
      default: null,
    },
    resourceType: {
      type: String,
      default: null,
    },
    suppressedCount: {
      type: Number,
      default: 0,
    },
    recoveryAlert: {
      type: Boolean,
      default: false,
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

// TTL: auto-delete ALL alerts after 90 days regardless of resolved status
alertSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 90 * 24 * 60 * 60 }
);

const Alert = mongoose.model("Alert", alertSchema);

export default Alert;
