import express from "express";
import { listContainers, getContainerLogs } from "../docker/containers.js";
import { inspectContainer } from "../services/containerInspect.service.js";
import { parseLogs } from "../services/logParser.service.js";

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

export default router;
