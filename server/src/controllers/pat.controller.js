import crypto from "crypto";
import Pat from "../models/pat.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { standardResponse } from "../utils/apiResponse.js";
import { ValidationError, NotFoundError } from "../utils/AppError.js";
import { logAuthEvent, AUTH_EVENTS } from "../services/authAudit.service.js";

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export const createPat = asyncHandler(async (req, res) => {
  const { name, expiresDays = 30 } = req.body;
  if (!name) throw new ValidationError("Token name is required");

  // Generate the raw token
  const rawToken = "dse_" + crypto.randomBytes(32).toString("base64url");
  const hashedToken = hashToken(rawToken);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresDays);

  const pat = await Pat.create({
    name,
    hashedToken,
    user: req.user._id,
    scopes: ["api:full"], // default full scope for now
    expiresAt,
    deviceName: req.headers["user-agent"] || "CLI",
  });

  logAuthEvent({
    event: "PAT_CREATED",
    userId: req.user._id,
    ip: req.ip,
    userAgent: req.headers["user-agent"],
    metadata: { patId: pat._id, name: pat.name },
  });

  // Return the raw token ONLY ONCE
  res.status(201).json(standardResponse({
    pat: {
      id: pat._id,
      name: pat.name,
      expiresAt: pat.expiresAt,
      createdAt: pat.createdAt,
    },
    token: rawToken
  }));
});

export const listPats = asyncHandler(async (req, res) => {
  const pats = await Pat.find({ user: req.user._id, isRevoked: false })
    .select("-hashedToken")
    .sort({ createdAt: -1 });

  res.json(standardResponse({ pats }));
});

export const revokePat = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const pat = await Pat.findOneAndUpdate(
    { _id: id, user: req.user._id, isRevoked: false },
    { $set: { isRevoked: true } },
    { new: true }
  );

  if (!pat) throw new NotFoundError("PAT not found or already revoked");

  logAuthEvent({
    event: "PAT_REVOKED",
    userId: req.user._id,
    ip: req.ip,
    userAgent: req.headers["user-agent"],
    metadata: { patId: pat._id, name: pat.name },
  });

  res.json(standardResponse({ message: "Token revoked successfully" }));
});
