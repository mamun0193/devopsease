import mongoose from "mongoose";

const extensionInstallationSchema = new mongoose.Schema(
  {
    manifest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ExtensionManifest",
      required: true,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: false, // If null, it's a globally installed extension
    },
    installedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    configuration: {
      type: mongoose.Schema.Types.Mixed, // The actual configuration values provided by the user
      default: {},
    },
    webhookBaseUrl: {
      type: String,
      required: false, // The target URL for this installation's webhooks
    },
    webhookSecret: {
      type: String,
      required: false, // HMAC secret for signing webhooks sent to this installation
    },
    status: {
      type: String,
      enum: ["installed", "configured", "enabled", "disabled", "error"],
      default: "installed",
    },
    errorMessage: {
      type: String, // To store errors if it enters the 'error' state
    },
  },
  {
    timestamps: true,
  }
);

// One installation of a specific extension per project (or globally)
extensionInstallationSchema.index({ manifest: 1, project: 1 }, { unique: true });

const ExtensionInstallation = mongoose.model("ExtensionInstallation", extensionInstallationSchema);
export default ExtensionInstallation;
