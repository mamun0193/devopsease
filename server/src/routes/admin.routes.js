import express from "express";
import { requireRole, ROLES } from "../middlewares/rbac.js";
import activityMonitor from "../security/activityMonitor.js";
import authMiddleware from "../middlewares/auth.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { standardResponse } from "../utils/apiResponse.js";

const router = express.Router();

router.use(authMiddleware);

router.get(
    "/anomaly-report",
    requireRole(ROLES.ADMIN),
    asyncHandler(async (req, res) => {
        const suspiciousUsers = activityMonitor.getSuspiciousUsers();
        res.status(200).json(standardResponse({ users: suspiciousUsers }, "Anomaly report retrieved successfully"));
    })
);

export default router;
