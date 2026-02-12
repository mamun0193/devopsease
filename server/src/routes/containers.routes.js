import express from "express";
import { getContainerLogs } from "../docker/containers.js";
import containerCacheService from "../services/containerCache.service.js";
import { parseLogs } from "../services/logParser.service.js";
import {
  startContainer,
  stopContainer,
  restartContainer,
  removeContainer,
  pauseContainer,
  unpauseContainer,
  createContainer,
} from "../docker/containerActions.js";
import containerStatsService from "../services/containerStats.service.js";
import { requireRole, ROLES } from "../middlewares/rbac.js";
import { requirePermission } from "../middlewares/rbac.middleware.js";
import { ACTIONS, canPerform } from "../config/permissions.js";
import AppError from "../utils/AppError.js";
import { validateDatabase } from "../middlewares/validateDatabase.js";
import authMiddleware from "../middlewares/auth.middleware.js";
import ownershipService from "../services/ownership.service.js";
import { ownershipGuard } from "../middlewares/ownershipGuard.js";
import logger from "../utils/logger.js";

const router = express.Router();

// Apply DB validation and Auth to ALL container routes
router.use(validateDatabase);
router.use(authMiddleware);

// GET /containers
// List owned containers with sanitized details
router.get("/", requirePermission(ACTIONS.READ), async (req, res, next) => {
  try {
    // 1. Get list of IDs owned by this user
    // This avoids global Docker queries
    const ownedContainerIds = await ownershipService.listOwnedContainers(req.user._id);

    // 2. Get lightweight summary for each owned container (single inspect call, cached)
    const containerPromises = ownedContainerIds.map(async (id) => {
      try {
        const summary = await containerCacheService.getContainerSummary(id);
        return { ...summary, id };
      } catch (err) {
        // If a container exists in DB but not in Docker (orphan), we might get an error
        logger.warn(`Failed to inspect owned container ${id}`, { error: err.message });
        return null;
      }
    });

    const containers = (await Promise.all(containerPromises)).filter(c => c !== null);

    // 3. Response is already sanitized by getContainerSummary
    const sanitizedContainers = containers.map(c => ({
      id: c.id,
      name: c.name,
      image: c.image,
      state: c.state,
      ports: c.ports,
      created: c.state?.startedAt
    }));

    // Calculate Permissions for UI (Soft Enforcement)
    // Non-admins see only owned resources. Admins see all but have universal access.
    // In both cases, "ownsResource: true" correctly reflects "Can I act on the items in THIS list?".
    const permContext = { role: req.user.role, ownsResource: true };
    const permissions = {
      canRead: canPerform({ ...permContext, actionType: ACTIONS.READ }),
      canOperate: canPerform({ ...permContext, actionType: ACTIONS.OPERATE }),
      canDestroy: canPerform({ ...permContext, actionType: ACTIONS.DESTRUCTIVE }),
    };

    res.status(200).json({
      success: true,
      data: sanitizedContainers,
      permissions, // <--- Added
      message: "Containers retrieved successfully",
    });
  } catch (err) {
    next(err);
  }
});

// POST /containers
// Create a new container from an image
// Kept ROLES.OPERATOR check as per existing logic, assuming only operators create?
// If users can create, this should be adjusted.
router.post("/", requireRole(ROLES.OPERATOR), async (req, res, next) => {
  let createdContainerId = null;
  try {
    if (!req.body) {
      throw new AppError("Request body is missing. Ensure Content-Type is 'application/json'", 400);
    }
    const { image, name, ports, env, autoStart } = req.body;

    if (!image) {
      throw new AppError("Image name is required", 400);
    }

    // 1. Create in Docker
    const result = await createContainer({ image, name, ports, env, autoStart });
    if (!result.success) {
      throw new AppError(result.message, result.statusCode);
    }

    createdContainerId = result.data.id;

    // 2. Register Ownership (Atomic-like via compensating transaction)
    await ownershipService.registerContainer(req.user._id, createdContainerId);

    res.status(result.statusCode).json({
      success: result.success,
      data: result.data,
      message: result.message,
    });
  } catch (err) {
    // Compensating Transaction
    if (createdContainerId) {
      logger.warn(`Compensating Transaction: Removing orphaned container ${createdContainerId} due to DB failure`);
      try {
        await removeContainer(createdContainerId, true);
      } catch (cleanupErr) {
        logger.error(`CRITICAL: Failed to cleanup orphaned container ${createdContainerId}`, { error: cleanupErr.message });
      }
    }
    next(err);
  }
});

// GET /containers/:id/logs
router.get("/:id/logs", ownershipGuard("logs"), requirePermission(ACTIONS.READ), async (req, res, next) => {
  try {
    const { tail, since, until } = req.query;
    const options = {
      tail: tail ? parseInt(tail, 10) : 500,
      since: since ? parseInt(since, 10) : undefined,
      until: until ? parseInt(until, 10) : undefined,
    };
    const rawLogs = await getContainerLogs(req.params.id, options);
    const { logs, stats } = parseLogs(rawLogs);
    res.status(200).json({
      success: true,
      data: {
        raw: rawLogs,
        parsed: logs,
        stats
      },
      message: "Container logs retrieved successfully",
    });
  } catch (err) {
    next(err);
  }
});

// GET /containers/:id/inspect
router.get("/:id/inspect", ownershipGuard("inspect"), requirePermission(ACTIONS.READ), async (req, res, next) => {
  try {
    // ownership verification handled by middleware
    const data = await containerCacheService.getContainerInspect(req.params.id);
    // Calculate Permissions for UI
    const permContext = { role: req.user.role, ownsResource: req.ownsResource };
    const permissions = {
      canRead: canPerform({ ...permContext, actionType: ACTIONS.READ }),
      canOperate: canPerform({ ...permContext, actionType: ACTIONS.OPERATE }),
      canDestroy: canPerform({ ...permContext, actionType: ACTIONS.DESTRUCTIVE }),
    };

    res.status(200).json({
      success: true,
      data,
      permissions, // <--- Added
      message: "Container inspection completed successfully"
    });
  } catch (err) {
    next(err);
  }
});

// POST /containers/:id/start
router.post("/:id/start", ownershipGuard("start"), requirePermission(ACTIONS.OPERATE), async (req, res, next) => {
  try {
    const result = await startContainer(req.params.id);
    if (!result.success) {
      throw new AppError(result.message, result.statusCode);
    }
    res.status(result.statusCode).json({
      success: result.success,
      data: result.data,
      message: result.message,
    });
  } catch (err) {
    next(err);
  }
});

// POST /containers/:id/stop
router.post("/:id/stop", ownershipGuard("stop"), requirePermission(ACTIONS.OPERATE), async (req, res, next) => {
  try {
    const result = await stopContainer(req.params.id);
    if (!result.success) {
      throw new AppError(result.message, result.statusCode);
    }
    res.status(result.statusCode).json({
      success: result.success,
      data: result.data,
      message: result.message,
    });
  } catch (err) {
    next(err);
  }
});

// POST /containers/:id/restart
router.post("/:id/restart", ownershipGuard("restart"), requirePermission(ACTIONS.OPERATE), async (req, res, next) => {
  try {
    const result = await restartContainer(req.params.id);
    if (!result.success) {
      throw new AppError(result.message, result.statusCode);
    }
    res.status(result.statusCode).json({
      success: result.success,
      data: result.data,
      message: result.message,
    });
  } catch (err) {
    next(err);
  }
});

// POST /containers/:id/pause
router.post("/:id/pause", ownershipGuard("pause"), requirePermission(ACTIONS.OPERATE), async (req, res, next) => {
  try {
    const result = await pauseContainer(req.params.id);
    if (!result.success) {
      throw new AppError(result.message, result.statusCode);
    }
    res.status(result.statusCode).json({
      success: result.success,
      data: result.data,
      message: result.message,
    });
  } catch (err) {
    next(err);
  }
});

// POST /containers/:id/unpause
router.post("/:id/unpause", ownershipGuard("unpause"), requirePermission(ACTIONS.OPERATE), async (req, res, next) => {
  try {
    const result = await unpauseContainer(req.params.id);
    if (!result.success) {
      throw new AppError(result.message, result.statusCode);
    }
    res.status(result.statusCode).json({
      success: result.success,
      data: result.data,
      message: result.message,
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /containers/:id
router.delete("/:id", ownershipGuard("remove"), requirePermission(ACTIONS.DESTRUCTIVE), async (req, res, next) => {
  try {
    const force = req.query.force === "true";
    const result = await removeContainer(req.params.id, force);

    if (!result.success) {
      throw new AppError(result.message, result.statusCode);
    }

    // Release ownership after successful removal
    await ownershipService.releaseOwnership(req.user._id, req.params.id);

    res.status(result.statusCode).json({
      success: result.success,
      data: result.data,
      message: result.message,
    });
  } catch (err) {
    next(err);
  }
});

// GET /containers/:id/stats
router.get("/:id/stats", ownershipGuard("stats"), requirePermission(ACTIONS.READ), async (req, res, next) => {
  try {
    const result = await containerStatsService.getContainerStats(req.params.id);

    if (!result.success) {
      return res.status(result.statusCode || 500).json({
        success: false,
        data: null,
        message: result.error
      });
    }

    return res.status(200).json({
      success: true,
      data: result.data,
      message: 'Container stats retrieved successfully'
    });
  } catch (err) {
    next(err);
  }
});

export default router;
