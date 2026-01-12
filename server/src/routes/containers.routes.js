const express = require("express");
const { listContainers, getContainerLogs } = require("../docker/containers");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const containers = await listContainers();
    res.json(containers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id/logs", async (req, res) => {
  try {
    const logs = await getContainerLogs(req.params.id);
    res.send(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
