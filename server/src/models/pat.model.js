import mongoose from "mongoose";

const patSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    hashedToken: {
      type: String,
      required: true,
      unique: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    scopes: [
      {
        type: String,
        required: true,
      },
    ],
    expiresAt: {
      type: Date,
      required: true,
    },
    lastUsedAt: {
      type: Date,
    },
    deviceName: {
      type: String,
      default: "Unknown",
    },
    isRevoked: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient lookup
patSchema.index({ hashedToken: 1 });
patSchema.index({ user: 1, isRevoked: 1 });

const Pat = mongoose.model("Pat", patSchema);
export default Pat;
