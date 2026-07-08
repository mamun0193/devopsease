import mongoose from "mongoose";
import { CapabilityRegistry } from "../platform/security/CapabilityRegistry.js";

const extensionManifestSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    version: {
      type: String,
      required: true,
    },
    author: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    compatibility: {
      platformVersion: {
        type: String,
        required: true, // e.g. "^1.0.0"
      },
    },
    capabilities: [
      {
        type: String,
        validate: {
          validator: (v) => CapabilityRegistry.isValidCapability(v),
          message: (props) => `${props.value} is not a valid platform capability`,
        },
      },
    ],
    webhooks: [
      {
        eventPattern: {
          type: String, // e.g. "build.*", "repository.created"
          required: true,
        },
        path: {
          type: String, // e.g. "/webhooks/events" (appended to the installation's base URL)
          required: true,
        },
      },
    ],
    configSchema: {
      type: mongoose.Schema.Types.Mixed, // JSON Schema for the plugin configuration
      required: false,
    },
    metadata: {
      iconUrl: String,
      documentationUrl: String,
      homepageUrl: String,
    },
  },
  {
    timestamps: true,
  }
);

// Extensions are uniquely identified by name and version
extensionManifestSchema.index({ name: 1, version: 1 }, { unique: true });

const ExtensionManifest = mongoose.model("ExtensionManifest", extensionManifestSchema);
export default ExtensionManifest;
