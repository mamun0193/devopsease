import mongoose from "mongoose";

const apiKeySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    hashedKey: {
      type: String,
      required: true,
      unique: true,
    },
    extensionInstallation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ExtensionInstallation",
      required: true,
    },
    expiresAt: {
      type: Date,
      required: false, // API Keys for extensions might not expire automatically
    },
    lastUsedAt: {
      type: Date,
    },
    isRevoked: {
      type: Boolean,
      default: false,
    },
    rateLimitTier: {
      type: String,
      enum: ["standard", "elevated", "unlimited"],
      default: "standard",
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient lookup
apiKeySchema.index({ hashedKey: 1 });
apiKeySchema.index({ extensionInstallation: 1, isRevoked: 1 });

const ApiKey = mongoose.model("ApiKey", apiKeySchema);
export default ApiKey;
