// Route definitions for container management.
import express from "express";
import { requireRole, ROLES } from "../middlewares/rbac.js";
import { requirePermission } from "../middlewares/rbac.middleware.js";
import { ACTIONS } from "../config/permissions.js";
import { validateDatabase } from "../middlewares/validateDatabase.js";
import authMiddleware from "../middlewares/auth.middleware.js";
import { ownershipGuard } from "../middlewares/ownershipGuard.js";
import {
  listContainers,
  removeAllContainers,
  createContainerHandler,
  getContainerLogsHandler,
  inspectContainer,
  startContainerHandler,
  stopContainerHandler,
  restartContainerHandler,
  pauseContainerHandler,
  unpauseContainerHandler,
  removeContainerHandler,
  getContainerStats,
  getTopContainers,
  getMetricsHistory,
  getRecentMetrics,
} from "../controllers/containers.controller.js";

const router = express.Router();

// Apply DB validation and Auth to ALL container routes
router.use(validateDatabase);
router.use(authMiddleware);

// List / CRUD
router.get("/", requirePermission(ACTIONS.READ), listContainers);
router.delete("/all", requirePermission(ACTIONS.DESTRUCTIVE), removeAllContainers);
router.post("/", requireRole(ROLES.OPERATOR), createContainerHandler);

// Logs / Inspect
router.get("/:id/logs", ownershipGuard("logs"), requirePermission(ACTIONS.READ), getContainerLogsHandler);
router.get("/:id/inspect", ownershipGuard("inspect"), requirePermission(ACTIONS.READ), inspectContainer);

// Lifecycle
router.post("/:id/start", ownershipGuard("start"), requirePermission(ACTIONS.OPERATE), startContainerHandler);
router.post("/:id/stop", ownershipGuard("stop"), requirePermission(ACTIONS.OPERATE), stopContainerHandler);
router.post("/:id/restart", ownershipGuard("restart"), requirePermission(ACTIONS.OPERATE), restartContainerHandler);
router.post("/:id/pause", ownershipGuard("pause"), requirePermission(ACTIONS.OPERATE), pauseContainerHandler);
router.post("/:id/unpause", ownershipGuard("unpause"), requirePermission(ACTIONS.OPERATE), unpauseContainerHandler);
router.delete("/:id", ownershipGuard("remove"), requirePermission(ACTIONS.DESTRUCTIVE), removeContainerHandler);

// Stats / Metrics
router.get("/:id/stats", ownershipGuard("stats"), requirePermission(ACTIONS.READ), getContainerStats);
router.get("/top", requirePermission(ACTIONS.READ), getTopContainers);
router.get("/:id/metrics-history", ownershipGuard("metrics-history"), requirePermission(ACTIONS.READ), getMetricsHistory);
router.get("/:id/recent-metrics", ownershipGuard("recent-metrics"), requirePermission(ACTIONS.READ), getRecentMetrics);

export default router;
