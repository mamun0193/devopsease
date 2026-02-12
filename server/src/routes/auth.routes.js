import express from "express";
import passport from "passport";
import { loginSuccess, logout, refresh, register, login } from "../controllers/auth.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";

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

router.post("/register", register);
router.post("/login", login);
router.post("/refresh", refresh);
router.post("/logout", logout);

import checkAuthStatus from "../middlewares/authStatus.middleware.js";

// ... (imports)

router.get("/me", checkAuthStatus, (req, res) => {
  res.json({ isAuthenticated: !!req.user, user: req.user });
});

export default router;
