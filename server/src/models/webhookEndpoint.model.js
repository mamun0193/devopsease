import mongoose from "mongoose";

const webhookEndpointSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: true,
      trim: true,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: false, // Null for global webhooks
    },
    extensionInstallation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ExtensionInstallation",
      required: false, // If this webhook was created by an extension
    },
    subscriptions: [
      {
        type: String,
        required: true, // e.g. "build.*", "repository.push"
      },
    ],
    signingSecret: {
      type: String,
      required: true, // HMAC SHA-256 secret
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    consecutiveFailures: {
      type: Number,
      default: 0,
    },
    description: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

webhookEndpointSchema.index({ project: 1 });
webhookEndpointSchema.index({ extensionInstallation: 1 });

const WebhookEndpoint = mongoose.model("WebhookEndpoint", webhookEndpointSchema);
export default WebhookEndpoint;
