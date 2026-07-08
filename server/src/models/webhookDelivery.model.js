import mongoose from "mongoose";

const webhookDeliverySchema = new mongoose.Schema(
  {
    endpoint: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WebhookEndpoint",
      required: true,
    },
    eventTypes: [
      {
        type: String,
        required: true, // e.g., ["build.succeeded"]
      },
    ],
    status: {
      type: String,
      enum: ["pending", "success", "failed", "dead_letter"],
      default: "pending",
    },
    statusCode: {
      type: Number, // HTTP status code from the receiving server
    },
    requestPayload: {
      type: mongoose.Schema.Types.Mixed, // The JSON payload sent
      required: true,
    },
    responseBody: {
      type: String, // Truncated response body from receiver
    },
    errorMessage: {
      type: String, // Internal error message if delivery failed
    },
    deliveryTimeMs: {
      type: Number,
    },
    attemptCount: {
      type: Number,
      default: 0,
    },
    nextRetryAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

webhookDeliverySchema.index({ endpoint: 1, createdAt: -1 });
webhookDeliverySchema.index({ status: 1, nextRetryAt: 1 }); // Useful for processing retries
webhookDeliverySchema.index({ createdAt: 1 }, { expireAfterSeconds: 14 * 24 * 60 * 60 }); // 14 days TTL

const WebhookDelivery = mongoose.model("WebhookDelivery", webhookDeliverySchema);
export default WebhookDelivery;
