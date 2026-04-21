import mongoose from "mongoose";

const quotaSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },

    // --- Limits (derived from plan, can be overridden by admin) ---
    maxContainers: {
      type: Number,
      required: true,
      default: 2,
    },
    maxCPU: {
      type: Number,  // CPU cores (e.g. 1 = 1 core, 0.5 = half core)
      required: true,
      default: 1,
    },
    maxMemoryMB: {
      type: Number,  // Megabytes
      required: true,
      default: 512,
    },
    maxStorageMB: {
      type: Number,  // Megabytes (1024 = 1 GB)
      required: true,
      default: 1024,
    },
    storageType: {
      type: String,
      enum: ['ephemeral', 'persistent'],
      default: 'ephemeral',
    },

    // --- Current Usage ---
    usedContainers: {
      type: Number,  // Incremented/decremented on container create/remove
      default: 0,
      min: 0,
    },
    usedCPU: {
      type: Number,  // Actual CPU cores from Docker stats (set by resource monitor)
      default: 0,
      min: 0,
    },
    usedMemoryMB: {
      type: Number,  // Actual memory in MB from Docker stats (set by resource monitor)
      default: 0,
      min: 0,
    },
  },
  { timestamps: true, versionKey: false }
);

const Quota = mongoose.model("Quota", quotaSchema);

export default Quota;
