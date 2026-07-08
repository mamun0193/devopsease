import express from "express";
import authMiddleware from "../middlewares/auth.middleware.js";
import { validateDatabase } from "../middlewares/validateDatabase.js";
import alertService from "../services/alert.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { paginatedResponse, standardResponse, getPagination } from "../utils/apiResponse.js";
import { NotFoundError } from "../utils/AppError.js";

const router = express.Router();

router.use(validateDatabase);
router.use(authMiddleware);

// GET /alerts — List alerts for the current user (paginated)
router.get("/", asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { resolved } = req.query;
    const { page, limit } = getPagination(req);

    const options = { limit, page };
    if (resolved !== undefined) {
      options.resolved = resolved === "true";
    }

    const result = await alertService.getAlerts(userId, options);
    res.status(200).json(paginatedResponse(result.alerts, result.total, result.page, result.limit));
}));

// GET /alerts/unresolved-count — Count of unresolved alerts
router.get("/unresolved-count", asyncHandler(async (req, res) => {
    const count = await alertService.getUnresolvedCount(req.user._id);
    res.status(200).json(standardResponse({ count }));
}));

// PATCH /alerts/:id/resolve — Resolve a single alert
router.patch("/:id/resolve", asyncHandler(async (req, res) => {
    const alert = await alertService.resolveAlert(req.params.id, req.user._id);
    if (!alert) {
      throw new NotFoundError("Alert not found");
    }
    res.status(200).json(standardResponse(alert));
}));

// PATCH /alerts/resolve-all — Resolve all unresolved alerts for the user
router.patch("/resolve-all", asyncHandler(async (req, res) => {
    const count = await alertService.resolveAll(req.user._id);
    res.status(200).json(standardResponse({ resolved: count }));
}));

export default router;
