
import { generateAccessToken, generateRefreshToken, verifyRefreshToken, rotateRefreshToken, revokeSessionFamily } from "../utils/jwt.js";
import { resolveOAuthUser } from "../services/auth.service.js";
import User from "../models/User.js";
import bcrypt from "bcryptjs";

// Cookie options
export const COOKIE_OPTS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
};

export const REFRESH_COOKIE_OPTS = {
    ...COOKIE_OPTS,
    path: "/auth/refresh", // Restrict path
};


export const register = async (req, res, next) => {
    try {
        const { email, password, name } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        const existingUser = await User.findOne({ primaryEmail: email });
        if (existingUser) {
            return res.status(400).json({ message: "Email already registered" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await User.create({
            primaryEmail: email,
            password: hashedPassword,
            name,
            role: "operator", // Default role
            plan: "free",
        });

        // Auto-login after registration
        const accessToken = generateAccessToken(newUser);
        const refreshToken = await generateRefreshToken(newUser, req.ip, req.headers["user-agent"]);

        res.cookie("access_token", accessToken, { ...COOKIE_OPTS, maxAge: 15 * 60 * 1000 });
        res.cookie("refresh_token", refreshToken, { ...REFRESH_COOKIE_OPTS, maxAge: 7 * 24 * 60 * 60 * 1000 });

        res.status(201).json({ success: true, user: { email: newUser.primaryEmail, name: newUser.name, role: newUser.role } });

    } catch (error) {
        next(error);
    }
};

export const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        const user = await User.findOne({ primaryEmail: email }).select("+password");
        if (!user || !user.password) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        user.lastLoginAt = new Date();
        await user.save();

        const accessToken = generateAccessToken(user);
        const refreshToken = await generateRefreshToken(user, req.ip, req.headers["user-agent"]);

        res.cookie("access_token", accessToken, { ...COOKIE_OPTS, maxAge: 15 * 60 * 1000 });
        res.cookie("refresh_token", refreshToken, { ...REFRESH_COOKIE_OPTS, maxAge: 7 * 24 * 60 * 60 * 1000 });

        res.json({ success: true, user: { email: user.primaryEmail, name: user.name, role: user.role } });

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

        res.cookie("access_token", accessToken, { ...COOKIE_OPTS, maxAge: 15 * 60 * 1000 }); // 15 min
        res.cookie("refresh_token", refreshToken, { ...REFRESH_COOKIE_OPTS, maxAge: 7 * 24 * 60 * 60 * 1000 }); // 7 days

        // Redirect to frontend
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
                // Reuse detected! Revoke entire family
                await revokeSessionFamily(doc.familyId);
            }
            res.clearCookie("access_token");
            res.clearCookie("refresh_token", { path: "/auth/refresh" });
            return res.status(401).json({ message: "Invalid or reused refresh token" });
        }

        // Check expiry
        if (new Date() > doc.expiresAt) {
            res.clearCookie("access_token");
            res.clearCookie("refresh_token", { path: "/auth/refresh" });
            return res.status(401).json({ message: "Session expired" });
        }

        // Rotate
        const ipAddress = req.ip;
        const userAgent = req.headers["user-agent"];
        const start = Date.now();

        // Use a lock or database transaction ideally, but for now simple sequential ops
        const newRefreshToken = await rotateRefreshToken(doc, ipAddress, userAgent);
        const newAccessToken = generateAccessToken(doc.userId);

        res.cookie("access_token", newAccessToken, { ...COOKIE_OPTS, maxAge: 15 * 60 * 1000 });
        res.cookie("refresh_token", newRefreshToken, { ...REFRESH_COOKIE_OPTS, maxAge: 7 * 24 * 60 * 60 * 1000 });

        res.json({ success: true });

    } catch (error) {
        next(error);
    }
};

export const logout = async (req, res, next) => {
    try {
        const token = req.cookies.refresh_token;
        if (token) {
            const doc = await verifyRefreshToken(token);
            if (doc) {
                doc.revoked = true;
                doc.revokedAt = new Date();
                await doc.save();
            }
        }

        res.clearCookie("access_token");
        res.clearCookie("refresh_token", { path: "/auth/refresh" });
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
};
