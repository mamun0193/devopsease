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
import AppError from "../utils/AppError.js";
import { validateDatabase } from "../middlewares/validateDatabase.js";
import authMiddleware from "../middlewares/auth.middleware.js";
import ownershipService from "../services/ownership.service.js";
import logger from "../utils/logger.js";

const router = express.Router();

// Apply DB validation and Auth to ALL container routes
router.use(validateDatabase);
router.use(authMiddleware);

router.get("/", async (req, res, next) => {
  try {
    // 1. Get list of IDs owned by this user
    const ownedContainerIds = await ownershipService.listOwnedContainers(req.user._id);

    // 2. Get all containers from Docker/Cache
    const containers = await containerCacheService.getContainers();

    // 3. Filter to show ONLY owned containers

    // 3. Filter to show ONLY owned containers
    // Docker returns full 64-char IDs. Ownership DB stores 12-char short IDs.
    // We normalize both to short IDs for comparison.
    const ownedContainers = containers.filter(c => {
      const shortId = c.Id.substring(0, 12);
      return ownedContainerIds.includes(shortId);
    });

    res.status(200).json({
      success: true,
      data: ownedContainers,
      message: "Containers retrieved successfully",
    });
  } catch (err) {
    next(err);
  }
});

// POST /containers
// Create a new container from an image
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

    createdContainerId = result.data.id; // Usually short ID if from dockerActions?
    // Wait, dockerActions.js line 880 returns `id: containerId` which is `Id.substring(0, 12)`
    // So we are storing SHORT IDs. This is consistent.

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
        // Force remove to ensure we clean up, even if it started running
        await removeContainer(createdContainerId, true);
      } catch (cleanupErr) {
        logger.error(`CRITICAL: Failed to cleanup orphaned container ${createdContainerId}`, { error: cleanupErr.message });
      }
    }
    next(err);
  }
});

router.get("/:id/logs", async (req, res, next) => {
  try {
    await ownershipService.verifyOwnership(req.user._id, req.params.id);

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

router.get("/:id/inspect", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) {
      throw new AppError("Container ID is required", 400);
    }
    await ownershipService.verifyOwnership(req.user._id, id);

    const data = await containerCacheService.getContainerInspect(id);
    res.status(200).json({
      success: true,
      data,
      message: "Container inspection completed successfully"
    });
  } catch (err) {
    next(err);
  }
});

// Container control endpoints

// POST /containers/:id/start
// Start a stopped container
router.post("/:id/start", requireRole(ROLES.OPERATOR), async (req, res, next) => {
  try {
    await ownershipService.verifyOwnership(req.user._id, req.params.id);

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
// Stop a running container
router.post("/:id/stop", requireRole(ROLES.OPERATOR), async (req, res, next) => {
  try {
    await ownershipService.verifyOwnership(req.user._id, req.params.id);

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
// Restart a container (stop + start)
router.post("/:id/restart", requireRole(ROLES.OPERATOR), async (req, res, next) => {
  try {
    await ownershipService.verifyOwnership(req.user._id, req.params.id);

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
// Pause a running container
router.post("/:id/pause", requireRole(ROLES.OPERATOR), async (req, res, next) => {
  try {
    await ownershipService.verifyOwnership(req.user._id, req.params.id);

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
// Unpause a paused container
router.post("/:id/unpause", requireRole(ROLES.OPERATOR), async (req, res, next) => {
  try {
    await ownershipService.verifyOwnership(req.user._id, req.params.id);

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
// Remove a container
// Query param: force=true to remove running containers
router.delete("/:id", requireRole(ROLES.OPERATOR), async (req, res, next) => {
  try {
    await ownershipService.verifyOwnership(req.user._id, req.params.id);

    const force = req.query.force === "true";
    const result = await removeContainer(req.params.id, force);

    if (!result.success) {
      throw new AppError(result.message, result.statusCode);
    }

    // Only release ownership if removal from Docker succeeded
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

router.get("/:id/stats", async (req, res, next) => {
  try {
    const { id } = req.params;
    await ownershipService.verifyOwnership(req.user._id, id);

    const result = await containerStatsService.getContainerStats(id);

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
