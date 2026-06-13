import mongoose from "mongoose";

const containerMetricSchema = new mongoose.Schema(
    {
        containerId: {
            type: String,
            required: true,
            index: true,
        },
        ownerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            index: true,
        },
        resolution: {
            type: String,
            enum: ["30s", "10m", "1h"],
            default: "30s",
        },

        // ── Raw / point-in-time fields (used by all resolutions) ──
        cpuPercent: { type: Number, default: 0 },
        memoryUsedMB: { type: Number, default: 0 },
        memoryLimitMB: { type: Number, default: 0 },
        memoryPercent: { type: Number, default: 0 },
        networkRxMB: { type: Number, default: 0 },
        networkTxMB: { type: Number, default: 0 },

        // ── Aggregated fields (populated for 10m and 1h resolutions) ──
        cpuAvg: { type: Number },
        cpuMax: { type: Number },
        cpuMin: { type: Number },
        memoryAvg: { type: Number },
        memoryMax: { type: Number },
        memoryMin: { type: Number },
    },
    {
        timestamps: { createdAt: "timestamp", updatedAt: false },
    }
);

// TTL: auto-delete metrics older than 30 days
containerMetricSchema.index({ timestamp: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

// Primary query index: container + resolution + time range
containerMetricSchema.index({ containerId: 1, resolution: 1, timestamp: -1 });

// Cleanup index: resolution + timestamp for tiered retention queries
containerMetricSchema.index({ resolution: 1, timestamp: 1 });

const ContainerMetric = mongoose.model("ContainerMetric", containerMetricSchema);
export default ContainerMetric;
