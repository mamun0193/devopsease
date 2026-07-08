import ExtensionManifest from "../../models/extensionManifest.model.js";
import ExtensionInstallation from "../../models/extensionInstallation.model.js";
import ApiKey from "../../models/apiKey.model.js";
import WebhookEndpoint from "../../models/webhookEndpoint.model.js";
import crypto from "crypto";
import Ajv from "ajv";

const ajv = new Ajv();

export const LifecycleManager = {
  /**
   * Validate configuration against the manifest's JSON schema (if any).
   */
  validateConfiguration(manifest, configuration) {
    if (!manifest.configSchema) return true;
    
    const validate = ajv.compile(manifest.configSchema);
    const valid = validate(configuration);
    
    if (!valid) {
      throw new Error(`Configuration validation failed: ${ajv.errorsText(validate.errors)}`);
    }
    
    return true; 
  },

  async install(manifestId, projectId, userId) {
    const manifest = await ExtensionManifest.findById(manifestId);
    if (!manifest) throw new Error("Manifest not found");

    const installation = new ExtensionInstallation({
      manifest: manifest._id,
      project: projectId,
      installedBy: userId,
      status: "installed",
      webhookSecret: crypto.randomBytes(32).toString("hex"),
    });

    await installation.save();
    return installation;
  },

  async configure(installationId, configuration, webhookBaseUrl) {
    const installation = await ExtensionInstallation.findById(installationId).populate("manifest");
    if (!installation) throw new Error("Installation not found");

    if (installation.status !== "installed" && installation.status !== "disabled") {
        throw new Error(`Cannot configure from status: ${installation.status}`);
    }

    if (!this.validateConfiguration(installation.manifest, configuration)) {
      throw new Error("Invalid configuration");
    }

    installation.configuration = configuration;
    if (webhookBaseUrl) {
        installation.webhookBaseUrl = webhookBaseUrl;
    }
    installation.status = "configured";
    
    await installation.save();
    return installation;
  },

  async enable(installationId) {
    const installation = await ExtensionInstallation.findById(installationId);
    if (!installation) throw new Error("Installation not found");

    if (installation.status !== "configured" && installation.status !== "disabled") {
      throw new Error(`Cannot enable from status: ${installation.status}`);
    }

    installation.status = "enabled";
    await installation.save();

    // Generate or re-enable an API Key for this installation if it doesn't have one
    let apiKey = await ApiKey.findOne({ extensionInstallation: installation._id, isRevoked: false });
    let rawKey = null;

    if (!apiKey) {
      rawKey = crypto.randomBytes(32).toString("hex");
      const hashedKey = crypto.createHash("sha256").update(rawKey).digest("hex");
      
      apiKey = new ApiKey({
        name: `Key for ${installation._id}`,
        hashedKey,
        extensionInstallation: installation._id,
      });
      await apiKey.save();
    }

    // Register Webhooks in the Webhook subsystem if the manifest defines any and a baseUrl is set
    const manifest = await ExtensionManifest.findById(installation.manifest);
    if (manifest && manifest.webhooks && manifest.webhooks.length > 0 && installation.webhookBaseUrl) {
      for (const wh of manifest.webhooks) {
        // Find existing endpoint for this installation/eventPattern or create new
        let endpoint = await WebhookEndpoint.findOne({
          extensionInstallation: installation._id,
          "subscriptions": wh.eventPattern
        });

        if (!endpoint) {
          endpoint = new WebhookEndpoint({
            url: new URL(wh.path, installation.webhookBaseUrl).toString(),
            project: installation.project,
            extensionInstallation: installation._id,
            subscriptions: [wh.eventPattern],
            signingSecret: installation.webhookSecret,
            isActive: true,
            description: `Webhook for ${manifest.name} (${wh.eventPattern})`,
          });
          await endpoint.save();
        } else {
          endpoint.isActive = true;
          await endpoint.save();
        }
      }
    }

    // Return the installation and the rawKey (which will be null if a key already existed and we are just re-enabling)
    return { installation, rawKey };
  },

  async disable(installationId) {
    const installation = await ExtensionInstallation.findById(installationId);
    if (!installation) throw new Error("Installation not found");

    if (installation.status !== "enabled") {
        throw new Error(`Cannot disable from status: ${installation.status}`);
    }

    installation.status = "disabled";
    await installation.save();

    // Disable webhooks associated with this installation
    await WebhookEndpoint.updateMany(
      { extensionInstallation: installation._id },
      { $set: { isActive: false } }
    );

    return installation;
  },

  async uninstall(installationId) {
    const installation = await ExtensionInstallation.findById(installationId);
    if (!installation) throw new Error("Installation not found");

    // Revoke all associated API Keys
    await ApiKey.updateMany(
      { extensionInstallation: installation._id },
      { $set: { isRevoked: true } }
    );

    // Delete associated webhooks
    await WebhookEndpoint.deleteMany({ extensionInstallation: installation._id });

    // Delete the installation record
    await ExtensionInstallation.deleteOne({ _id: installation._id });
    
    return true;
  }
};
