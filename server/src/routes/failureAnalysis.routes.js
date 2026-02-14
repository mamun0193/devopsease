import express from "express";
import { analyzeContainer } from "../services/containerAnalysis.service.js";
import { ownershipGuard } from "../middlewares/ownershipGuard.js";
import { requirePermission } from "../middlewares/rbac.middleware.js";
import { ACTIONS } from "../config/permissions.js";
import authMiddleware from "../middlewares/auth.middleware.js";
import { validateDatabase } from "../middlewares/validateDatabase.js";

const router = express.Router();

router.use(validateDatabase);
router.use(authMiddleware);

router.get(
    "/:id/failure-analysis",
    ownershipGuard("failure-analysis"),
    requirePermission(ACTIONS.READ),
    async (req, res, next) => {
        try {
            const { id } = req.params;
            const analysis = await analyzeContainer(id);

            res.status(200).json({
                success: true,
                data: analysis,
                message: "Failure analysis completed successfully",
            });
        } catch (err) {
            if (err.statusCode === 404 || err.message?.includes("No such container")) {
                return res.status(404).json({
                    success: false,
                    data: null,
                    message: "Container not found",
                });
            }
            next(err);
        }
    }
);

export default router;
