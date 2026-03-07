import mongoose from "mongoose";

const HEALTH_STATUSES = ["HEALTHY", "DEGRADED", "UNHEALTHY"];

const healthHistoryEntrySchema = new mongoose.Schema(
  {
    healthStatus: { type: String, enum: HEALTH_STATUSES },
    failureType: { type: String, default: null },
    instabilityScore: { type: Number, default: 0 },
    changedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const containerHealthSchema = new mongoose.Schema(
  {
    containerId: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    healthStatus: {
      type: String,
      enum: HEALTH_STATUSES,
      default: "HEALTHY",
    },
    lastFailureType: {
      type: String,
      default: null,
    },
    restartCount: {
      type: Number,
      default: 0,
    },
    lastExitCode: {
      type: Number,
      default: null,
    },
    lastDockerHealthStatus: {
      // From Docker HEALTHCHECK: healthy | starting | unhealthy | none
      type: String,
      default: null,
    },
    instabilityScore: {
      type: Number,
      default: 0,
    },
    // Compact ring-buffer of last 20 health changes for timeline
    history: {
      type: [healthHistoryEntrySchema],
      default: [],
    },
    lastUpdatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient lookups by owner
containerHealthSchema.index({ userId: 1, containerId: 1 }, { unique: true });

// TTL: auto-delete stale records after 30 days
containerHealthSchema.index({ lastUpdatedAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

const ContainerHealth = mongoose.model("ContainerHealth", containerHealthSchema);
export default ContainerHealth;
