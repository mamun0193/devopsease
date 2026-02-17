import express from "express";
import docker from "../docker/client.js";
import metricsRegistry from "../observability/metricsRegistry.js";
import lifecycle from "../system/lifecycle.js";

const router = express.Router();

const getHealth = async (req, res) => {
  // Check if server is shutting down (Readiness Check)
  if (lifecycle.isShuttingDown) {
    return res.status(503).json({
      status: "shutting_down",
      timestamp: new Date().toISOString(),
      shuttingDown: true,
      services: {
        docker: "unknown"
      }
    });
  }

  const health = {
    status: "ok",
    uptimeSeconds: metricsRegistry.getUptimeSeconds(),
    timestamp: new Date().toISOString(),
    memoryUsage: process.memoryUsage(),
    systemMemory: {
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + "MB",
      heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + "MB",
      heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + "MB",
    },
    metrics: metricsRegistry.getHealthSnapshot(),
    services: {
      docker: "unknown",
    },
    shuttingDown: false
  };

  try {
    // Non-blocking Docker check with timeout (Liveness/Dependency Check)
    await Promise.race([
      docker.ping(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timed out")), 2000))
    ]);

    health.services.docker = "connected";
  } catch (error) {
    // If Docker is down, we are DEGRADED but still ALIVE (Liveness pass, metrics/logs still accessible)
    health.status = "degraded";
    health.services.docker = "disconnected";
  }
  // Return 200 even if degraded (so K8s doesn't kill the pod for docker being slow)
  res.status(200).json(health);
};

router.get("/", getHealth);
router.post("/", getHealth); // Allow POST for flexibility

export default router;
