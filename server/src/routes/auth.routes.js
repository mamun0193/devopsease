import express from "express";
import passport from "passport";
import { resolveOAuthUser } from "../services/auth.service.js";
import { generateToken } from "../utils/jwt.js";
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
  async (req, res, next) => {
    try {
      const user = await resolveOAuthUser(req.user);
      const token = generateToken(user);

      res.cookie("auth", token, {
        httpOnly: true,
        sameSite: "lax",
        secure: false, // set true in prod
      });

      res.redirect("http://localhost:3497");
    } catch (err) {
      next(err);
    }
  }
);

// Google
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  passport.authenticate("google", { session: false }),
  async (req, res, next) => {
    try {
      const user = await resolveOAuthUser(req.user);
      const token = generateToken(user);

      res.cookie("auth", token, {
        httpOnly: true,
        sameSite: "lax",
        secure: false,
      });

      res.redirect("http://localhost:3497");
    } catch (err) {
      next(err);
    }
  }
);

router.get("/me", authMiddleware, (req, res) => {
  res.json(req.user);
});

export default router;
