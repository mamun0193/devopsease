import Pat from "../models/pat.model.js";
import ApiKey from "../models/apiKey.model.js";
import crypto from "crypto";
import { CapabilityRegistry } from "../platform/security/CapabilityRegistry.js";
import ExtensionInstallation from "../models/extensionInstallation.model.js"; // Assume this will be created
import { enforceRateLimit } from "./rateLimit.middleware.js";

const mapTierToPlan = (tier) => {
  if (tier === "elevated") return "pro";
  if (tier === "unlimited") return "premium";
  return "free";
};

/**
 * Authenticates requests using either a Personal Access Token (PAT) or an API Key.
 * Sets req.user (for PATs) or req.extension (for API Keys).
 * Also sets req.platformAuth = { type: 'pat' | 'apiKey', scopes: string[] }
 */
export const platformAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid authorization header. Expected Bearer token." });
  }

  const token = authHeader.substring(7);
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  try {
    let authContext = null;
    let rateLimitPlan = "free";
    let identityId = null;

    // 1. Check if it's a PAT
    const pat = await Pat.findOne({ hashedToken, isRevoked: false }).populate("user");
    if (pat) {
      if (pat.expiresAt < new Date()) {
        return res.status(401).json({ error: "Token expired" });
      }

      // Update last used asynchronously
      Pat.updateOne({ _id: pat._id }, { $set: { lastUsedAt: new Date() } }).exec();

      req.user = pat.user;
      rateLimitPlan = pat.user?.plan || "free";
      identityId = pat.user._id.toString();

      authContext = {
        type: "pat",
        scopes: pat.scopes,
        tokenId: pat._id,
      };
    } else {
      // 2. Check if it's an API Key
      const apiKey = await ApiKey.findOne({ hashedKey: hashedToken, isRevoked: false }).populate({
        path: "extensionInstallation",
        populate: { path: "manifest" },
      });

      if (apiKey) {
        if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
          return res.status(401).json({ error: "API Key expired" });
        }

        if (!apiKey.extensionInstallation || apiKey.extensionInstallation.status !== "enabled") {
          return res.status(403).json({ error: "Extension installation is not enabled or missing." });
        }

        // Update last used asynchronously
        ApiKey.updateOne({ _id: apiKey._id }, { $set: { lastUsedAt: new Date() } }).exec();

        req.extension = apiKey.extensionInstallation;
        rateLimitPlan = mapTierToPlan(apiKey.rateLimitTier);
        identityId = apiKey._id.toString();

        authContext = {
          type: "apiKey",
          scopes: apiKey.extensionInstallation.manifest.capabilities, // Derive scopes from manifest
          keyId: apiKey._id,
          rateLimitTier: apiKey.rateLimitTier,
        };
      }
    }

    if (!authContext) {
      return res.status(401).json({ error: "Invalid token or key" });
    }

    // Enforce rate limits
    const rateLimitResult = await enforceRateLimit(identityId, rateLimitPlan, "platform_api");
    if (rateLimitResult) {
      res.setHeader('X-RateLimit-Limit', rateLimitResult.limit);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, rateLimitResult.limit - rateLimitResult.currentCount));
    }

    req.platformAuth = authContext;
    return next();
  } catch (error) {
    if (error.statusCode === 429 && error.retryAfter) {
      res.setHeader('Retry-After', error.retryAfter);
      return res.status(429).json({ error: error.message });
    }
    if (error.statusCode === 503) {
       return res.status(503).json({ error: error.message });
    }
    console.error("Platform auth error:", error);
    return res.status(500).json({ error: "Internal server error during authentication" });
  }
};

/**
 * Middleware factory to require specific capabilities.
 * @param {string[]} requiredCapabilities - Array of capability strings from CapabilityRegistry.
 */
export const requireCapabilities = (requiredCapabilities) => {
  return (req, res, next) => {
    if (!CapabilityRegistry.validateCapabilities(requiredCapabilities)) {
      console.warn("Invalid capability requirements defined on route");
      return res.status(500).json({ error: "Route configuration error" });
    }

    if (!req.platformAuth) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { scopes } = req.platformAuth;

    // Check if the auth token has all required capabilities
    const hasCapabilities = requiredCapabilities.every((cap) => scopes.includes(cap));

    if (!hasCapabilities) {
      return res.status(403).json({
        error: "Forbidden",
        message: "Insufficient capabilities.",
        required: requiredCapabilities,
      });
    }

    next();
  };
};
