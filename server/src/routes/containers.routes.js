import express from "express";
import { listContainers, getContainerLogs } from "../docker/containers.js";
import { inspectContainer } from "../services/containerInspect.service.js";
import { parseLogs } from "../services/logParser.service.js";
import {
  startContainer,
  stopContainer,
  restartContainer,
  removeContainer,
} from "../docker/containerActions.js";

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const containers = await listContainers();
    res.status(200).json({
      success: true,
      data: containers,
      message: "Containers retrieved successfully",
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
    const data = await inspectContainer(id);
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

export default router;
