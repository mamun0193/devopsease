import jwt from "jsonwebtoken";
import crypto from "crypto";
import RefreshToken from "../models/RefreshToken.js";

const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY_DAYS = 7;

export function generateAccessToken(user) {
  return jwt.sign(
    {
      userId: user._id.toString(),
      role: user.role,
      plan: user.plan,
    },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
}

export async function generateRefreshToken(user, ipAddress, userAgent, expiryDays = REFRESH_TOKEN_EXPIRY_DAYS) {
  const token = crypto.randomBytes(40).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiryDays);

  const familyId = crypto.randomUUID();
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  await RefreshToken.create({
    userId: user._id,
    tokenHash,
    familyId,
    deviceId: "unknown", // Placeholder until frontend sends it
    ipAddress,
    userAgent,
    expiresAt,
  });

  return token;
}

export async function rotateRefreshToken(oldTokenDoc, ipAddress, userAgent) {
  // Revoke old token
  oldTokenDoc.revoked = true;
  oldTokenDoc.revokedAt = new Date();

  const newToken = crypto.randomBytes(40).toString("hex");
  const newTokenHash = crypto.createHash("sha256").update(newToken).digest("hex");

  oldTokenDoc.replacedByTokenHash = newTokenHash;
  await oldTokenDoc.save();

  // Create new token inheriting familyId and absolute expiresAt
  await RefreshToken.create({
    userId: oldTokenDoc.userId,
    tokenHash: newTokenHash,
    familyId: oldTokenDoc.familyId,
    deviceId: oldTokenDoc.deviceId,
    ipAddress,
    userAgent,
    expiresAt: oldTokenDoc.expiresAt, // Absolute lifetime constraint
  });

  return newToken;
}

export async function verifyRefreshToken(token) {
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const doc = await RefreshToken.findOne({ tokenHash }).populate('userId');
  return doc;
}

export async function revokeSessionFamily(familyId) {
  await RefreshToken.updateMany(
    { familyId, revoked: false },
    { revoked: true, revokedAt: new Date() }
  );
}
