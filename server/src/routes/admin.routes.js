import express from "express";
import { requireRole, ROLES } from "../middlewares/rbac.js";
import activityMonitor from "../security/activityMonitor.js";
import authMiddleware from "../middlewares/auth.middleware.js";

const router = express.Router();

router.use(authMiddleware);
router.get(
    "/anomaly-report",
    requireRole(ROLES.ADMIN),
    async (req, res, next) => {
        try {
            const suspiciousUsers = activityMonitor.getSuspiciousUsers();

            res.status(200).json({
                success: true,
                data: {
                    users: suspiciousUsers
                },
                message: "Anomaly report retrieved successfully"
            });
        } catch (err) {
            next(err);
        }
    }
);

export default router;
