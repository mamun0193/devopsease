
import { generateAccessToken, generateRefreshToken, verifyRefreshToken, rotateRefreshToken, revokeSessionFamily } from "../utils/jwt.js";
import { resolveOAuthUser } from "../services/auth.service.js";
import { checkBruteForce, recordFailedAttempt, resetAttempts } from "../services/bruteForce.service.js";
import { logAuthEvent, AUTH_EVENTS } from "../services/authAudit.service.js";
import User from "../models/User.js";
import bcrypt from "bcryptjs";
import metricsRegistry from "../observability/metricsRegistry.js";

const REMEMBER_ME_DAYS = 7;
const DEFAULT_REFRESH_DAYS = 1;
const ACCESS_TOKEN_MAX_AGE = 15 * 60 * 1000; // 15 min

export const COOKIE_OPTS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
};

export const REFRESH_COOKIE_OPTS = {
    ...COOKIE_OPTS,
    path: "/auth/refresh",
};

function getRefreshDays(rememberMe) {
    return rememberMe ? REMEMBER_ME_DAYS : DEFAULT_REFRESH_DAYS;
}

function getRefreshMaxAge(rememberMe) {
    return getRefreshDays(rememberMe) * 24 * 60 * 60 * 1000;
}

function extractMeta(req) {
    return { ip: req.ip, userAgent: req.headers["user-agent"] };
}

export const register = async (req, res, next) => {
    try {
        const { email, password, name } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters" });
        }

        const existingUser = await User.findOne({ primaryEmail: email });
        if (existingUser) {
            return res.status(400).json({ message: "Email already registered" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await User.create({
            primaryEmail: email,
            password: hashedPassword,
            name: name || email.split('@')[0],
            role: "operator",
            plan: "free",
        });

        logAuthEvent({
            event: AUTH_EVENTS.LOGIN_SUCCESS,
            userId: newUser._id,
            email,
            ...extractMeta(req),
            metadata: { method: "register" },
        });

        res.status(201).json({
            success: true,
            message: "Account created successfully",
        });

    } catch (error) {
        next(error);
    }
};

export const login = async (req, res, next) => {
    try {
        const { email, password, rememberMe } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        // Brute-force check
        const bruteCheck = await checkBruteForce(email);
        if (!bruteCheck.allowed) {
            logAuthEvent({
                event: bruteCheck.locked ? AUTH_EVENTS.RATE_LIMITED : AUTH_EVENTS.LOGIN_FAILED,
                email,
                ...extractMeta(req),
                metadata: {
                    reason: bruteCheck.locked ? "account_locked" : "throttled",
                    retryAfter: bruteCheck.retryAfter,
                },
            });

            return res.status(429).json({
                message: "Too many login attempts. Please try again later.",
                retryAfter: bruteCheck.retryAfter,
                locked: bruteCheck.locked,
            });
        }

        const user = await User.findOne({ primaryEmail: email }).select("+password");
        if (!user || !user.password) {
            await recordFailedAttempt(email);
            metricsRegistry.increment("failedLogins");
            logAuthEvent({
                event: AUTH_EVENTS.LOGIN_FAILED,
                email,
                ...extractMeta(req),
                metadata: { reason: "invalid_credentials" },
            });
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            await recordFailedAttempt(email);
            metricsRegistry.increment("failedLogins");
            logAuthEvent({
                event: AUTH_EVENTS.LOGIN_FAILED,
                userId: user._id,
                email,
                ...extractMeta(req),
                metadata: { reason: "wrong_password" },
            });
            return res.status(401).json({ message: "Invalid credentials" });
        }

        // Success — reset brute force counter
        await resetAttempts(email);

        user.lastLoginAt = new Date();
        await user.save();

        const refreshDays = getRefreshDays(rememberMe);
        const accessToken = generateAccessToken(user);
        const refreshToken = await generateRefreshToken(user, req.ip, req.headers["user-agent"], refreshDays);

        res.cookie("access_token", accessToken, { ...COOKIE_OPTS, maxAge: ACCESS_TOKEN_MAX_AGE });
        res.cookie("refresh_token", refreshToken, { ...REFRESH_COOKIE_OPTS, maxAge: getRefreshMaxAge(rememberMe) });

        logAuthEvent({
            event: AUTH_EVENTS.LOGIN_SUCCESS,
            userId: user._id,
            email,
            ...extractMeta(req),
        });

        res.json({
            success: true,
            user: { email: user.primaryEmail, name: user.name, role: user.role },
            expiresAt: Date.now() + ACCESS_TOKEN_MAX_AGE,
        });

    } catch (error) {
        next(error);
    }
};

export const loginSuccess = async (req, res, next) => {
    try {
        const user = await resolveOAuthUser(req.user);
        const ipAddress = req.ip;
        const userAgent = req.headers["user-agent"];

        const accessToken = generateAccessToken(user);
        const refreshToken = await generateRefreshToken(user, ipAddress, userAgent);

        res.cookie("access_token", accessToken, { ...COOKIE_OPTS, maxAge: ACCESS_TOKEN_MAX_AGE });
        res.cookie("refresh_token", refreshToken, { ...REFRESH_COOKIE_OPTS, maxAge: REMEMBER_ME_DAYS * 24 * 60 * 60 * 1000 });

        logAuthEvent({
            event: AUTH_EVENTS.LOGIN_SUCCESS,
            userId: user._id,
            ip: ipAddress,
            userAgent,
            metadata: { method: "oauth" },
        });

        res.redirect("http://localhost:5173");
    } catch (error) {
        next(error);
    }
};

export const refresh = async (req, res, next) => {
    try {
        const token = req.cookies.refresh_token;
        if (!token) {
            return res.status(401).json({ message: "No refresh token provided" });
        }

        const doc = await verifyRefreshToken(token);

        // Reuse detection
        if (!doc || doc.revoked) {
            if (doc) {
                await revokeSessionFamily(doc.familyId);
                logAuthEvent({
                    event: AUTH_EVENTS.REUSE_DETECTED,
                    userId: doc.userId?._id || doc.userId,
                    ...extractMeta(req),
                    metadata: { familyId: doc.familyId },
                });
            }
            logAuthEvent({
                event: AUTH_EVENTS.REFRESH_FAILED,
                ...extractMeta(req),
                metadata: { reason: doc ? "reuse_detected" : "token_not_found" },
            });
            res.clearCookie("access_token");
            res.clearCookie("refresh_token", { path: "/auth/refresh" });
            return res.status(401).json({ message: "Invalid or reused refresh token", reuse: !!doc });
        }

        // Check expiry
        if (new Date() > doc.expiresAt) {
            logAuthEvent({
                event: AUTH_EVENTS.REFRESH_FAILED,
                userId: doc.userId?._id || doc.userId,
                ...extractMeta(req),
                metadata: { reason: "expired" },
            });
            res.clearCookie("access_token");
            res.clearCookie("refresh_token", { path: "/auth/refresh" });
            return res.status(401).json({ message: "Session expired" });
        }

        // Rotate
        const newRefreshToken = await rotateRefreshToken(doc, req.ip, req.headers["user-agent"]);
        const newAccessToken = generateAccessToken(doc.userId);

        res.cookie("access_token", newAccessToken, { ...COOKIE_OPTS, maxAge: ACCESS_TOKEN_MAX_AGE });
        res.cookie("refresh_token", newRefreshToken, { ...REFRESH_COOKIE_OPTS, maxAge: 7 * 24 * 60 * 60 * 1000 });

        logAuthEvent({
            event: AUTH_EVENTS.REFRESH_SUCCESS,
            userId: doc.userId?._id || doc.userId,
            ...extractMeta(req),
        });

        metricsRegistry.increment("tokenRefreshCount");

        res.json({ success: true, expiresAt: Date.now() + ACCESS_TOKEN_MAX_AGE });

    } catch (error) {
        next(error);
    }
};

export const logout = async (req, res, next) => {
    try {
        const token = req.cookies.refresh_token;
        let userId = null;

        if (token) {
            const doc = await verifyRefreshToken(token);
            if (doc) {
                userId = doc.userId?._id || doc.userId;
                // Revoke the entire session family (all chained tokens)
                await revokeSessionFamily(doc.familyId);
            }
        }

        res.clearCookie("access_token", COOKIE_OPTS);
        res.clearCookie("refresh_token", REFRESH_COOKIE_OPTS);

        logAuthEvent({
            event: AUTH_EVENTS.LOGOUT,
            userId,
            ...extractMeta(req),
        });

        res.json({ success: true });
    } catch (error) {
        next(error);
    }
};
