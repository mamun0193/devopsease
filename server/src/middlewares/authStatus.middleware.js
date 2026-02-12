
import jwt from "jsonwebtoken";
import { generateAccessToken, generateRefreshToken, verifyRefreshToken, rotateRefreshToken } from "../utils/jwt.js";
import { COOKIE_OPTS, REFRESH_COOKIE_OPTS } from "../controllers/auth.controller.js";

export default async function checkAuthStatus(req, res, next) {
    const accessToken = req.cookies?.access_token;
    const refreshToken = req.cookies?.refresh_token;

    // 1. Check Access Token
    if (accessToken) {
        try {
            const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
            req.user = { ...decoded, _id: decoded.userId };
            return next();
        } catch (err) {
            // Access token expired/invalid, try refresh
        }
    }

    // 2. Check Refresh Token
    if (refreshToken) {
        try {
            const doc = await verifyRefreshToken(refreshToken);

            // Basic validity checks
            if (!doc || doc.revoked || new Date() > doc.expiresAt) {
                req.user = null;
                return next();
            }

            // Rotate Token
            const ipAddress = req.ip;
            const userAgent = req.headers["user-agent"];

            const newRefreshToken = await rotateRefreshToken(doc, ipAddress, userAgent);
            const newAccessToken = generateAccessToken({ _id: doc.userId._id, role: doc.userId.role, plan: doc.userId.plan });

            res.cookie("access_token", newAccessToken, { ...COOKIE_OPTS, maxAge: 15 * 60 * 1000 });
            res.cookie("refresh_token", newRefreshToken, { ...REFRESH_COOKIE_OPTS, maxAge: 7 * 24 * 60 * 60 * 1000 });

            req.user = {
                userId: doc.userId._id,
                _id: doc.userId._id,
                role: doc.userId.role,
                plan: doc.userId.plan
            };
            return next();

        } catch (error) {
            req.user = null;
            return next();
        }
    }

    // 3. No valid session
    req.user = null;
    next();
}
