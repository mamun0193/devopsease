import express from "express";
import { getContainerLogs } from "../docker/containers.js";
import containerCacheService from "../services/containerCache.service.js";
import { invalidateAnalysisCache } from "../services/containerAnalysis.service.js";
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

import { getMetricsHistory, getTopContainers, queryMetricsByRange, removeStream } from "../websocket/metricsStreamer.js";

import { requireRole, ROLES } from "../middlewares/rbac.js";
import { requirePermission } from "../middlewares/rbac.middleware.js";
import { ACTIONS, canPerform } from "../config/permissions.js";
import AppError from "../utils/AppError.js";
import { validateDatabase } from "../middlewares/validateDatabase.js";
import authMiddleware from "../middlewares/auth.middleware.js";
import ownershipService from "../services/ownership.service.js";
import { ownershipGuard } from "../middlewares/ownershipGuard.js";
import logger from "../utils/logger.js";
import activityMonitor from "../security/activityMonitor.js";
import resourceService from "../resources/resource.service.js";
import { RESOURCE_TYPES } from "../resources/resourceTypes.js";
import imageObservabilityService from "../services/imageObservability.service.js";
import tunnelService from "../services/tunnel.service.js";

import { PLANS } from "../config/plans.js";
import quotaService from "../services/quota.service.js";

const router = express.Router();

// Apply DB validation and Auth to ALL container routes
router.use(validateDatabase);
router.use(authMiddleware);

// List owned containers with sanitized details
router.get("/", requirePermission(ACTIONS.READ), async (req, res, next) => {
  try {
    // 1. Get list of IDs owned by this user
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
      created: c.created
    }));

    // Lazy Registration: Ensure these containers exist in Resource collection
    resourceService.syncResources(req.user._id, sanitizedContainers, RESOURCE_TYPES.CONTAINER).catch(err => {
      logger.error("Failed to sync resources", { error: err.message });
    });

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

// DELETE /containers/all
// Remove all containers owned by the current user
router.delete("/all", requirePermission(ACTIONS.DESTRUCTIVE), async (req, res, next) => {
  try {
    const ownedContainerIds = await ownershipService.listOwnedContainers(req.user._id);

    if (ownedContainerIds.length === 0) {
      return res.status(200).json({
        success: true,
        data: { removed: 0 },
        message: "No containers to remove",
      });
    }

    let removed = 0;
    const errors = [];

    for (const id of ownedContainerIds) {
      try {
        const result = await removeContainer(id, true);
        if (result.success) {
          await ownershipService.releaseOwnership(req.user._id, id);

          // Decrement container count (CPU/memory tracked by resource monitor)
          await quotaService.decrementContainerCount(req.user._id);

          await resourceService.updateResourceStatus(id, RESOURCE_TYPES.CONTAINER, 'deleted');
          removeStream(id);
          removed++;
        } else {
          errors.push({ id, error: result.message });
        }
      } catch (err) {
        errors.push({ id, error: err.message });
      }
    }

    containerCacheService.invalidateContainerList();

    res.status(200).json({
      success: true,
      data: { removed, total: ownedContainerIds.length, errors: errors.length > 0 ? errors : undefined },
      message: `${removed} container${removed !== 1 ? 's' : ''} removed`,
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
    const { image, name, ports, env, autoStart, cpuLimit: rawCpu, memoryLimit: rawMem, restartPolicy, maxRetryCount } = req.body;

    if (!image) {
      throw new AppError("Image name is required", 400);
    }

    // Default resource limits per container
    const cpuLimit = rawCpu ? Number(rawCpu) : 0.5;
    const memoryLimit = rawMem ? Number(rawMem) : 128;

    // Validate resource limit values
    if (isNaN(cpuLimit) || cpuLimit <= 0) {
      throw new AppError("cpuLimit must be a positive number", 400);
    }
    if (isNaN(memoryLimit) || memoryLimit < 4) {
      throw new AppError("memoryLimit must be at least 4 MB", 400);
    }

    // Ensure quota record exists, then check container count limit
    await quotaService.getOrCreateQuota(req.user._id, req.user.plan);
    await quotaService.checkContainerCount(req.user._id);

    // 1. Create in Docker with resource limits
    const result = await createContainer({ image, name, ports, env, autoStart, cpuLimit, memoryLimit, restartPolicy, maxRetryCount });
    if (!result.success) {
      throw new AppError(result.message, result.statusCode);
    }

    createdContainerId = result.data.id;

    // 2. Register Ownership (Atomic-like via compensating transaction)
    await ownershipService.registerContainer(req.user._id, createdContainerId);

    // Track Activity
    activityMonitor.recordContainerCreate(req.user._id);

    // 3. Update container count (CPU/memory tracked by resource monitor)
    await quotaService.incrementContainerCount(req.user._id);

    // Register Resource (Persistent Model) — store limits for quota release on delete
    await resourceService.registerResource({
      resourceId: createdContainerId,
      type: RESOURCE_TYPES.CONTAINER,
      ownerId: req.user._id,
      metadata: {
        image,
        name,
        cpuLimit,
        memoryLimit,
        createdVia: 'api',
        created: new Date()
      }
    });

    res.status(result.statusCode).json({
      success: result.success,
      data: result.data,
      message: result.message,
    });

    // Reconcile image usage after container create
    imageObservabilityService.reconcileImageUsage().catch(() => { });
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
    invalidateAnalysisCache(req.params.id); // Invalidate analysis cache
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
    invalidateAnalysisCache(req.params.id); // Invalidate analysis cache

    // Auto-revoke active tunnels for this container (fire-and-forget)
    tunnelService.revokeByContainer(req.params.id).catch(() => { });

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
    invalidateAnalysisCache(req.params.id); // Invalidate analysis cache

    // Track Activity
    activityMonitor.recordRestart(req.user._id);

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
    invalidateAnalysisCache(req.params.id); // Invalidate analysis cache
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
    invalidateAnalysisCache(req.params.id); // Invalidate analysis cache
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

    // Decrement container count (CPU/memory tracked by resource monitor)
    await quotaService.decrementContainerCount(req.user._id);

    await resourceService.updateResourceStatus(req.params.id, RESOURCE_TYPES.CONTAINER, 'deleted');

    removeStream(req.params.id);

    // Auto-revoke active tunnels for removed container (fire-and-forget)
    tunnelService.revokeByContainer(req.params.id).catch(() => { });

    res.status(result.statusCode).json({
      success: result.success,
      data: result.data,
      message: result.message,
    });

    // Reconcile image usage after container delete
    imageObservabilityService.reconcileImageUsage().catch(() => { });
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

// GET /containers/top — top containers by CPU and memory
router.get("/top", async (req, res) => {
  try {
    const data = getTopContainers();
    return res.status(200).json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to get top containers" });
  }
});

// GET /containers/:id/metrics-history — time-range metrics (1m, 1h, 1d, 1w)
router.get("/:id/metrics-history", ownershipGuard("metrics-history"), requirePermission(ACTIONS.READ), async (req, res) => {
  try {
    const range = req.query.range || "1m";
    const dataPoints = await queryMetricsByRange(req.params.id, range);
    return res.status(200).json({ success: true, data: { dataPoints } });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to get metrics history" });
  }
});

export default router;
