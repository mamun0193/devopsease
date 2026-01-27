import express from "express";
import { listContainers, getContainerLogs } from "../docker/containers.js";
import { inspectContainer } from "../services/containerInspect.service.js";

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
    const logs = await getContainerLogs(req.params.id);
    res.status(200).json({
      success: true,
      data: logs,
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
