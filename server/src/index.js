import express from "express";
import containersRoutes from "./routes/containers.routes.js";
import healthRoutes from "./routes/health.routes.js";
import analysisRoutes from "./routes/analysis.routes.js";
import actionsRoutes from "./routes/actions.routes.js";
import errorHandler from "./middlewares/errorHandler.js";
import readinessMiddleware from "./middlewares/readinessMiddleware.js";
import logger from "./utils/logger.js";
import requestLogger from "./middlewares/requestLogger.js";
import dotenv from "dotenv";
import cors from "cors";
import { connectRedis, disconnectRedis } from "./redis/client.js";
import readinessService from "./services/readiness.service.js";
import actionHistoryService from "./services/actionHistory.service.js";
import docker from "./docker/client.js";

dotenv.config();

const PORT = process.env.PORT || 4000;
const app = express();

// Middlewares
app.use(
  cors({
    origin: "http://localhost:5173",
  }),
);
app.use(express.json());
app.use(requestLogger);

// Readiness gate - returns 503 for non-health routes until fully initialized
app.use(readinessMiddleware);

// Routes
app.use(analysisRoutes);
app.use("/health", healthRoutes);
app.use("/containers", containersRoutes);
app.use("/actions", actionsRoutes);

// Error Handling Middleware
app.use(errorHandler);

// Initialize services and start server
async function startServer() {
  // Try to connect to Redis (non-blocking - server works without it)
  const redisConnected = await connectRedis();
  if (redisConnected) {
    logger.info("Redis caching enabled");
  } else {
    logger.warn("Redis not available - caching disabled, using direct Docker API calls");
  }

  // Verify Docker connection
  try {
    await docker.ping();
    readinessService.setDockerReady(true);
    logger.info("Docker connection verified");
  } catch (error) {
    logger.error("Docker connection failed", { error: error.message });
    readinessService.setDockerReady(false);
  }

  // Sync action history from Redis to memory (if Redis has data)
  await actionHistoryService.syncFromRedis();
  readinessService.setHistoryReady(true);

  const server = app.listen(PORT, () => {
    logger.info(`DevOpsEase server running on http://localhost:${PORT}`);
    logger.info("Server readiness", readinessService.getStatus());
  });

  // Graceful shutdown
  const shutdown = async (signal) => {
    logger.info(`${signal} received, shutting down gracefully`);

    server.close(async () => {
      await disconnectRedis();
      logger.info("Server shut down complete");
      process.exit(0);
    });

    // Force shutdown after 10 seconds
    setTimeout(() => {
      logger.error("Forced shutdown after timeout");
      process.exit(1);
    }, 10000);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

startServer().catch((err) => {
  logger.error("Failed to start server", { error: err.message });
  process.exit(1);
});
