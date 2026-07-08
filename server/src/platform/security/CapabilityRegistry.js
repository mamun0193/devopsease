export const PlatformCapabilities = {
  // Repository
  REPOSITORY_READ: "repository:read",
  REPOSITORY_WRITE: "repository:write",

  // Build
  BUILD_READ: "build:read",
  BUILD_EXECUTE: "build:execute",

  // Deployment
  DEPLOYMENT_READ: "deployment:read",
  DEPLOYMENT_EXECUTE: "deployment:execute",

  // Release
  RELEASE_READ: "release:read",
  RELEASE_EXECUTE: "release:execute",

  // Previews
  PREVIEW_READ: "preview:read",
  PREVIEW_MANAGE: "preview:manage",

  // Domains
  DOMAIN_READ: "domain:read",
  DOMAIN_MANAGE: "domain:manage",

  // Webhooks
  WEBHOOK_READ: "webhook:read",
  WEBHOOK_MANAGE: "webhook:manage",

  // AI Copilot
  AI_COPILOT_USE: "ai_copilot:use",
  AI_SKILL_REGISTER: "ai_skill:register",

  // Extensions
  EXTENSION_READ: "extension:read",
  EXTENSION_MANAGE: "extension:manage",
};

export const CapabilityRegistry = {
  capabilities: Object.values(PlatformCapabilities),

  /**
   * Checks if a provided scope string is a valid capability.
   */
  isValidCapability(capability) {
    return this.capabilities.includes(capability);
  },

  /**
   * Validates an array of capabilities. Returns true if all are valid.
   */
  validateCapabilities(capabilities) {
    if (!Array.isArray(capabilities)) return false;
    return capabilities.every((cap) => this.isValidCapability(cap));
  },
};
