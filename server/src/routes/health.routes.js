import express from "express";
import docker from "../docker/client.js";
import metricsRegistry from "../observability/metricsRegistry.js";
import logger from "../utils/logger.js";

const router = express.Router();

const getHealth = async (req, res) => {
  const health = {
    status: "ok",
    uptimeSeconds: metricsRegistry.getUptimeSeconds(),
    timestamp: new Date().toISOString(),
    memoryUsage: process.memoryUsage(),
    metrics: metricsRegistry.getHealthSnapshot(),
    services: {
      docker: "unknown",
    }
  };

  try {
    // Non-blocking Docker check with timeout
    const dockerPing = Promise.race([
      docker.ping().then(() => "connected"),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timed out")), 1000))
    ]);

    await dockerPing;
    health.services.docker = "connected";
  } catch (error) {
    health.status = "degraded";
    health.services.docker = "disconnected";
    logger.warn("Health check degraded: Docker unreachable", { error: error.message });
  }

  // Always return 200 OK, even if degraded (liveness probe)
  res.json(health);
};

router.get("/", getHealth);
router.post("/", getHealth); // Allow POST for flexibility

export default router;
