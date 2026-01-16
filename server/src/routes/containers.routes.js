const express = require("express");
const { listContainers, getContainerLogs } = require("../docker/containers");

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

module.exports = router;
