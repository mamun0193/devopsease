import express from "express";
import authMiddleware from "../middlewares/auth.middleware.js";
import { validateDatabase } from "../middlewares/validateDatabase.js";
import { ownershipGuard } from "../middlewares/ownershipGuard.js";
import { requirePermission } from "../middlewares/rbac.middleware.js";
import { ACTIONS } from "../config/permissions.js";
import ownershipService from "../services/ownership.service.js";
import { getHealthState, getHealthStatesBatch } from "../services/containerHealth.service.js";
import AppError from "../utils/AppError.js";

const router = express.Router();

router.use(validateDatabase);
router.use(authMiddleware);

// GET /containers/:id/health
// Returns the persisted health state for a single container
router.get(
    "/:id/health",
    ownershipGuard("health"),
    requirePermission(ACTIONS.READ),
    async (req, res, next) => {
        try {
            const { id } = req.params;
            const healthDoc = await getHealthState(id);

            if (!healthDoc) {
                // No health record yet — return a default HEALTHY state
                return res.status(200).json({
                    success: true,
                    data: {
                        containerId: id,
                        healthStatus: "HEALTHY",
                        lastFailureType: null,
                        restartCount: 0,
                        lastExitCode: null,
                        lastDockerHealthStatus: null,
                        instabilityScore: 0,
                        history: [],
                        lastUpdatedAt: null,
                    },
                    message: "No health data yet — container appears healthy",
                });
            }

            res.status(200).json({
                success: true,
                data: healthDoc,
                message: "Container health state retrieved successfully",
            });
        } catch (err) {
            next(err);
        }
    }
);

// GET /containers/health/batch?ids[]=id1&ids[]=id2
// Returns health states for multiple containers (used by the container list page)
router.get(
    "/health/batch",
    requirePermission(ACTIONS.READ),
    async (req, res, next) => {
        try {
            // Accept both ids[] and ids as query params
            let ids = req.query.ids || req.query["ids[]"];
            if (!ids) {
                return res.status(400).json({
                    success: false,
                    data: null,
                    message: "ids query parameter is required",
                });
            }

            // Normalize to array
            if (!Array.isArray(ids)) ids = [ids];

            // Security: only return health states for containers owned by this user
            const ownedIds = await ownershipService.listOwnedContainers(req.user._id);
            const authorizedIds = ids.filter(id => ownedIds.includes(id));

            const healthDocs = await getHealthStatesBatch(authorizedIds);

            // Build a map for efficient client-side lookup
            const healthMap = {};
            for (const doc of healthDocs) {
                healthMap[doc.containerId] = {
                    healthStatus: doc.healthStatus,
                    lastFailureType: doc.lastFailureType,
                    instabilityScore: doc.instabilityScore,
                    restartCount: doc.restartCount,
                    lastUpdatedAt: doc.lastUpdatedAt,
                };
            }

            res.status(200).json({
                success: true,
                data: healthMap,
                message: "Batch health states retrieved successfully",
            });
        } catch (err) {
            next(err);
        }
    }
);

export default router;
