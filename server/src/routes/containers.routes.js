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

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const containers = await containerCacheService.getContainers();
    res.status(200).json({
      success: true,
      data: containers,
      message: "Containers retrieved successfully",
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /containers
 * Create a new container from an image
 */
router.post("/", async (req, res, next) => {
  try {
    const { image, name, ports, env, autoStart } = req.body;

    if (!image) {
      return res.status(400).json({
        success: false,
        data: null,
        message: "Image name is required",
      });
    }

    const result = await createContainer({ image, name, ports, env, autoStart });
    res.status(result.statusCode).json({
      success: result.success,
      data: result.data,
      message: result.message,
    });
  } catch (err) {
    next(err);
  }
});

router.get("/:id/logs", async (req, res, next) => {
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

router.get("/:id/inspect", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Container ID is required'
      });
    }
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

/**
 * POST /containers/:id/start
 * Start a stopped container
 */
router.post("/:id/start", async (req, res, next) => {
  try {
    const result = await startContainer(req.params.id);
    res.status(result.statusCode).json({
      success: result.success,
      data: result.data,
      message: result.message,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /containers/:id/stop
 * Stop a running container
 */
router.post("/:id/stop", async (req, res, next) => {
  try {
    const result = await stopContainer(req.params.id);
    res.status(result.statusCode).json({
      success: result.success,
      data: result.data,
      message: result.message,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /containers/:id/restart
 * Restart a container (stop + start)
 */
router.post("/:id/restart", async (req, res, next) => {
  try {
    const result = await restartContainer(req.params.id);
    res.status(result.statusCode).json({
      success: result.success,
      data: result.data,
      message: result.message,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /containers/:id/pause
 * Pause a running container
 */
router.post("/:id/pause", async (req, res, next) => {
  try {
    const result = await pauseContainer(req.params.id);
    res.status(result.statusCode).json({
      success: result.success,
      data: result.data,
      message: result.message,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /containers/:id/unpause
 * Unpause a paused container
 */
router.post("/:id/unpause", async (req, res, next) => {
  try {
    const result = await unpauseContainer(req.params.id);
    res.status(result.statusCode).json({
      success: result.success,
      data: result.data,
      message: result.message,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /containers/:id
 * Remove a container
 * Query param: force=true to remove running containers
 */
router.delete("/:id", async (req, res, next) => {
  try {
    const force = req.query.force === "true";
    const result = await removeContainer(req.params.id, force);
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
