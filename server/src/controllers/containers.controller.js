// All container HTTP handlers — routes now only call these functions.

import docker from "../docker/client.js";
import { getContainerLogs } from "../docker/containers.js";
import containerCacheService from "../services/containerCache.service.js";
import { invalidateAnalysisCache } from "../services/containerAnalysis.service.js";
import { parseLogs } from "../services/logParser.service.js";
import {
  startContainer as dockerStart,
  stopContainer as dockerStop,
  restartContainer as dockerRestart,
  removeContainer as dockerRemove,
  pauseContainer as dockerPause,
  unpauseContainer as dockerUnpause,
  createContainer as dockerCreate,
} from "../docker/containerActions.js";
import containerStatsService from "../services/containerStats.service.js";
import { getTopContainers as getTopContainersHelper, queryMetricsByRange, removeStream } from "../websocket/metricsStreamer.js";
import globalMetricsCollector from "../services/globalMetricsCollector.js";
import { ACTIONS, canPerform } from "../config/permissions.js";
import AppError from "../utils/AppError.js";
import ownershipService from "../services/ownership.service.js";
import logger from "../utils/logger.js";
import activityMonitor from "../security/activityMonitor.js";
import resourceService from "../resources/resource.service.js";
import { RESOURCE_TYPES } from "../resources/resourceTypes.js";
import imageObservabilityService from "../services/imageObservability.service.js";
import tunnelService from "../services/tunnel.service.js";
import quotaService from "../services/quota.service.js";

// List owned containers 

export async function listContainers(req, res, next) {
  try {
    const ownedContainerIds = await ownershipService.listOwnedContainers(req.user._id);

    const containerPromises = ownedContainerIds.map(async (id) => {
      try {
        const summary = await containerCacheService.getContainerSummary(id);
        return { ...summary, id };
      } catch (err) {
        logger.warn(`Failed to inspect owned container ${id}`, { error: err.message });
        return null;
      }
    });

    const containers = (await Promise.all(containerPromises)).filter(c => c !== null);

    const sanitizedContainers = containers.map(c => ({
      id: c.id,
      name: c.name,
      image: c.image,
      state: c.state,
      ports: c.ports,
      created: c.created
    }));

    resourceService.syncResources(req.user._id, sanitizedContainers, RESOURCE_TYPES.CONTAINER).catch(err => {
      logger.error("Failed to sync resources", { error: err.message });
    });

    const permContext = { role: req.user.role, ownsResource: true };
    const permissions = {
      canRead: canPerform({ ...permContext, actionType: ACTIONS.READ }),
      canOperate: canPerform({ ...permContext, actionType: ACTIONS.OPERATE }),
      canDestroy: canPerform({ ...permContext, actionType: ACTIONS.DESTRUCTIVE }),
    };

    res.status(200).json({
      success: true,
      data: sanitizedContainers,
      permissions,
      message: "Containers retrieved successfully",
    });
  } catch (err) {
    next(err);
  }
}

// Remove all owned containers 

export async function removeAllContainers(req, res, next) {
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
        const result = await dockerRemove(id, true);
        if (result.success) {
          await ownershipService.releaseOwnership(req.user._id, id);
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
}

// Create a new container 

export async function createContainerHandler(req, res, next) {
  let createdContainerId = null;
  try {
    if (!req.body) {
      throw new AppError("Request body is missing. Ensure Content-Type is 'application/json'", 400);
    }
    const { image, name, ports, env, autoStart, cpuLimit: rawCpu, memoryLimit: rawMem, restartPolicy, maxRetryCount } = req.body;

    if (!image) {
      throw new AppError("Image name is required", 400);
    }

    const validPolicies = ['no', 'always', 'unless-stopped', 'on-failure'];
    if (restartPolicy && !validPolicies.includes(restartPolicy)) {
      throw new AppError(`Invalid restart policy. Must be one of: ${validPolicies.join(', ')}`, 400);
    }
    if (maxRetryCount !== undefined && (isNaN(Number(maxRetryCount)) || Number(maxRetryCount) < 1 || Number(maxRetryCount) > 100)) {
      throw new AppError('maxRetryCount must be a number between 1 and 100', 400);
    }

    const cpuLimit = rawCpu ? Number(rawCpu) : 0.5;
    const memoryLimit = rawMem ? Number(rawMem) : 128;

    if (isNaN(cpuLimit) || cpuLimit <= 0) {
      throw new AppError("cpuLimit must be a positive number", 400);
    }
    if (isNaN(memoryLimit) || memoryLimit < 4) {
      throw new AppError("memoryLimit must be at least 4 MB", 400);
    }

    await quotaService.getOrCreateQuota(req.user._id, req.user.plan);
    await quotaService.checkContainerCount(req.user._id);

    const result = await dockerCreate({ image, name, ports, env, autoStart, cpuLimit, memoryLimit, restartPolicy, maxRetryCount });
    if (!result.success) {
      throw new AppError(result.message, result.statusCode);
    }

    createdContainerId = result.data.id;

    await ownershipService.registerContainer(req.user._id, createdContainerId);
    activityMonitor.recordContainerCreate(req.user._id);
    await quotaService.incrementContainerCount(req.user._id);

    await resourceService.registerResource({
      resourceId: createdContainerId,
      type: RESOURCE_TYPES.CONTAINER,
      ownerId: req.user._id,
      metadata: {
        image,
        name,
        cpuLimit,
        memoryLimit,
        restartPolicy: restartPolicy || 'no',
        maxRetryCount: (restartPolicy && restartPolicy !== 'no') ? Number(maxRetryCount) || 3 : 0,
        createdVia: 'api',
        created: new Date()
      }
    });

    res.status(result.statusCode).json({
      success: result.success,
      data: result.data,
      message: result.message,
    });

    imageObservabilityService.reconcileImageUsage().catch(() => { });
  } catch (err) {
    if (createdContainerId) {
      logger.warn(`Compensating Transaction: Removing orphaned container ${createdContainerId} due to DB failure`);
      try {
        await dockerRemove(createdContainerId, true);
      } catch (cleanupErr) {
        logger.error(`CRITICAL: Failed to cleanup orphaned container ${createdContainerId}`, { error: cleanupErr.message });
      }
    }
    next(err);
  }
}

// Container logs 

export async function getContainerLogsHandler(req, res, next) {
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
      data: { raw: rawLogs, parsed: logs, stats },
      message: "Container logs retrieved successfully",
    });
  } catch (err) {
    next(err);
  }
}

// Container inspect 

export async function inspectContainer(req, res, next) {
  try {
    const data = await containerCacheService.getContainerInspect(req.params.id);
    const permContext = { role: req.user.role, ownsResource: req.ownsResource };
    const permissions = {
      canRead: canPerform({ ...permContext, actionType: ACTIONS.READ }),
      canOperate: canPerform({ ...permContext, actionType: ACTIONS.OPERATE }),
      canDestroy: canPerform({ ...permContext, actionType: ACTIONS.DESTRUCTIVE }),
    };

    res.status(200).json({
      success: true,
      data,
      permissions,
      message: "Container inspection completed successfully"
    });
  } catch (err) {
    next(err);
  }
}

// Lifecycle actions (start/stop/restart/pause/unpause/remove) 

export async function startContainerHandler(req, res, next) {
  try {
    const result = await dockerStart(req.params.id);
    if (!result.success) throw new AppError(result.message, result.statusCode);
    invalidateAnalysisCache(req.params.id);
    res.status(result.statusCode).json({ success: result.success, data: result.data, message: result.message });
  } catch (err) { next(err); }
}

export async function stopContainerHandler(req, res, next) {
  try {
    const result = await dockerStop(req.params.id);
    if (!result.success) throw new AppError(result.message, result.statusCode);
    invalidateAnalysisCache(req.params.id);
    tunnelService.revokeByContainer(req.params.id).catch(() => { });
    res.status(result.statusCode).json({ success: result.success, data: result.data, message: result.message });
  } catch (err) { next(err); }
}

export async function restartContainerHandler(req, res, next) {
  try {
    const result = await dockerRestart(req.params.id);
    if (!result.success) throw new AppError(result.message, result.statusCode);
    invalidateAnalysisCache(req.params.id);
    activityMonitor.recordRestart(req.user._id);
    res.status(result.statusCode).json({ success: result.success, data: result.data, message: result.message });
  } catch (err) { next(err); }
}

export async function pauseContainerHandler(req, res, next) {
  try {
    const result = await dockerPause(req.params.id);
    if (!result.success) throw new AppError(result.message, result.statusCode);
    invalidateAnalysisCache(req.params.id);
    res.status(result.statusCode).json({ success: result.success, data: result.data, message: result.message });
  } catch (err) { next(err); }
}

export async function unpauseContainerHandler(req, res, next) {
  try {
    const result = await dockerUnpause(req.params.id);
    if (!result.success) throw new AppError(result.message, result.statusCode);
    invalidateAnalysisCache(req.params.id);
    res.status(result.statusCode).json({ success: result.success, data: result.data, message: result.message });
  } catch (err) { next(err); }
}

export async function removeContainerHandler(req, res, next) {
  try {
    const force = req.query.force === "true";
    const result = await dockerRemove(req.params.id, force);
    if (!result.success) throw new AppError(result.message, result.statusCode);

    await ownershipService.releaseOwnership(req.user._id, req.params.id);
    await quotaService.decrementContainerCount(req.user._id);
    await resourceService.updateResourceStatus(req.params.id, RESOURCE_TYPES.CONTAINER, 'deleted');
    removeStream(req.params.id);
    tunnelService.revokeByContainer(req.params.id).catch(() => { });

    res.status(result.statusCode).json({ success: result.success, data: result.data, message: result.message });

    imageObservabilityService.reconcileImageUsage().catch(() => { });
  } catch (err) { next(err); }
}

// Stats and metrics 

export async function getContainerStats(req, res, next) {
  try {
    const result = await containerStatsService.getContainerStats(req.params.id);
    if (!result.success) {
      return res.status(result.statusCode || 500).json({ success: false, data: null, message: result.error });
    }
    return res.status(200).json({ success: true, data: result.data, message: 'Container stats retrieved successfully' });
  } catch (err) { next(err); }
}

export async function getTopContainers(req, res) {
  try {
    const ownedContainerIds = await ownershipService.listOwnedContainers(req.user._id);
    if (ownedContainerIds.length === 0) {
      return res.status(200).json({ success: true, data: { topCPU: [], topMemory: [] } });
    }

    const allLatest = globalMetricsCollector.getAllLatest();
    const validStats = [];

    for (const id of ownedContainerIds) {
      const cached = allLatest.get(id);
      if (cached) {
        validStats.push({
          containerId: id,
          containerName: id,
          cpuPercent: cached.cpuPercent || 0,
          memoryUsedMB: cached.memoryUsedMB || 0,
          memoryLimitMB: cached.memoryLimitMB || 0,
        });
      }
    }

    try {
      const containers = await docker.listContainers({ filters: { status: ["running"] } });
      const nameMap = new Map();
      for (const c of containers) {
        const shortId = c.Id.substring(0, 12);
        const name = (c.Names?.[0] || "").replace(/^\//, "") || shortId;
        nameMap.set(shortId, name);
      }
      for (const s of validStats) {
        s.containerName = nameMap.get(s.containerId) || s.containerId;
      }
    } catch (_) {
      // names are optional, skip on error
    }

    const data = {
      topCPU: [...validStats].sort((a, b) => b.cpuPercent - a.cpuPercent).slice(0, 5),
      topMemory: [...validStats].sort((a, b) => b.memoryUsedMB - a.memoryUsedMB).slice(0, 5),
    };

    return res.status(200).json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to get top containers" });
  }
}

export async function getMetricsHistory(req, res) {
  try {
    const range = req.query.range || "1m";
    const dataPoints = await queryMetricsByRange(req.params.id, range);
    return res.status(200).json({ success: true, data: { dataPoints } });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to get metrics history" });
  }
}

export async function getRecentMetrics(req, res) {
  try {
    const dataPoints = globalMetricsCollector.getBuffer(req.params.id);
    return res.status(200).json({ success: true, data: { dataPoints } });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to get recent metrics" });
  }
}
