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
        cpuPercent: { type: Number, default: 0 },
        memoryUsedMB: { type: Number, default: 0 },
        memoryLimitMB: { type: Number, default: 0 },
        memoryPercent: { type: Number, default: 0 },
        networkRxMB: { type: Number, default: 0 },
        networkTxMB: { type: Number, default: 0 },
    },
    {
        timestamps: { createdAt: "timestamp", updatedAt: false },
    }
);

// TTL: auto-delete after 7 days
containerMetricSchema.index({ timestamp: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });

// Compound index for efficient time-range queries
containerMetricSchema.index({ containerId: 1, timestamp: -1 });

const ContainerMetric = mongoose.model("ContainerMetric", containerMetricSchema);
export default ContainerMetric;
