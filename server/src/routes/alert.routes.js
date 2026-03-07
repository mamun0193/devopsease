import express from "express";
import authMiddleware from "../middlewares/auth.middleware.js";
import { validateDatabase } from "../middlewares/validateDatabase.js";
import alertService from "../services/alert.service.js";

const router = express.Router();

router.use(validateDatabase);
router.use(authMiddleware);

// GET /alerts — List alerts for the current user (paginated)
// Query params: resolved (bool), limit (int), page (int)
router.get("/", async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { resolved, limit = 50, page = 1 } = req.query;

    const options = {
      limit: Math.min(parseInt(limit, 10) || 50, 100),
      page: parseInt(page, 10) || 1,
    };

    if (resolved !== undefined) {
      options.resolved = resolved === "true";
    }

    const result = await alertService.getAlerts(userId, options);

    res.status(200).json({
      success: true,
      data: result.alerts,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        pages: Math.ceil(result.total / result.limit),
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /alerts/unresolved-count — Count of unresolved alerts
router.get("/unresolved-count", async (req, res, next) => {
  try {
    const count = await alertService.getUnresolvedCount(req.user._id);
    res.status(200).json({ success: true, data: { count } });
  } catch (err) {
    next(err);
  }
});

// PATCH /alerts/:id/resolve — Resolve a single alert
router.patch("/:id/resolve", async (req, res, next) => {
  try {
    const alert = await alertService.resolveAlert(req.params.id, req.user._id);
    if (!alert) {
      return res.status(404).json({ success: false, message: "Alert not found" });
    }
    res.status(200).json({ success: true, data: alert });
  } catch (err) {
    next(err);
  }
});

// PATCH /alerts/resolve-all — Resolve all unresolved alerts for the user
router.patch("/resolve-all", async (req, res, next) => {
  try {
    const count = await alertService.resolveAll(req.user._id);
    res.status(200).json({ success: true, data: { resolved: count } });
  } catch (err) {
    next(err);
  }
});

export default router;
