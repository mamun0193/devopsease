import express from "express";
import passport from "passport";
import { loginSuccess, logout, refresh, register, login } from "../controllers/auth.controller.js";
import { authRateLimit } from "../middlewares/authRateLimit.middleware.js";
import checkAuthStatus from "../middlewares/authStatus.middleware.js";

const router = express.Router();

// GitHub
router.get(
  "/github",
  passport.authenticate("github", { scope: ["user:email"] })
);

router.get(
  "/github/callback",
  passport.authenticate("github", { session: false }),
  loginSuccess
);

// Google
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  passport.authenticate("google", { session: false }),
  loginSuccess
);

// Auth endpoints with rate limiting
router.post("/register", authRateLimit("register"), register);
router.post("/login", authRateLimit("login"), login);
router.post("/refresh", authRateLimit("refresh"), refresh);
router.post("/logout", logout);

// Session probe — returns full user profile
router.get("/me", checkAuthStatus, async (req, res) => {
  if (!req.user) return res.json({ isAuthenticated: false, user: null });

  try {
    const User = (await import("../models/User.js")).default;
    const dbUser = await User.findById(req.user._id).select("name primaryEmail role plan createdAt").lean();
    if (dbUser) {
      return res.json({
        isAuthenticated: true,
        user: {
          _id: dbUser._id,
          name: dbUser.name,
          email: dbUser.primaryEmail,
          role: dbUser.role,
          plan: dbUser.plan,
          createdAt: dbUser.createdAt,
        },
      });
    }
  } catch {
    // Fallback to JWT payload
  }

  res.json({ isAuthenticated: !!req.user, user: req.user });
});

export default router;
