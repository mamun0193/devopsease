import express from "express";
import http from "http";
import containersRoutes from "./routes/containers.routes.js";
import healthRoutes from "./routes/health.routes.js";
import analysisRoutes from "./routes/analysis.routes.js";
import actionsRoutes from "./routes/actions.routes.js";
import errorHandler from "./middlewares/errorHandler.js";
import { requireRole } from "./middlewares/rbac.js";
import readinessMiddleware from "./middlewares/readinessMiddleware.js";
import logger from "./utils/logger.js";
import requestLogger from "./middlewares/requestLogger.js";
import dotenv from "dotenv";
import cors from "cors";
import { connectRedis, disconnectRedis } from "./redis/client.js";
import readinessService from "./services/readiness.service.js";
import actionHistoryService from "./services/actionHistory.service.js";
import docker from "./docker/client.js";
import { initializeWebSocketServer, closeWebSocketServer } from "./websocket/ws.js";

dotenv.config();

const PORT = process.env.PORT || 4000;
const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
  }),
);
app.use(express.json());
app.use(requestLogger);

app.use(readinessMiddleware);

app.use(analysisRoutes);
app.use("/health", healthRoutes);
app.use("/containers", containersRoutes);
app.use("/actions", actionsRoutes);

app.use(errorHandler);

async function startServer() {
  const redisConnected = await connectRedis();
  if (redisConnected) {
    logger.info("Redis caching enabled");
  } else {
    logger.warn("Redis not available - caching disabled, using direct Docker API calls");
  }

  try {
    await docker.ping();
    readinessService.setDockerReady(true);
    logger.info("Docker connection verified");
  } catch (error) {
    logger.error("Docker connection failed", { error: error.message });
    readinessService.setDockerReady(false);
  }

  await actionHistoryService.syncFromRedis();
  readinessService.setHistoryReady(true);

  const httpServer = http.createServer(app);

  initializeWebSocketServer(httpServer);

  httpServer.listen(PORT, () => {
    logger.info(`DevOpsEase server running on http://localhost:${PORT}`);
    logger.info("Server readiness", readinessService.getStatus());

    // Initialize WebSocket Server (Day 29)
    initializeWebSocketServer(server);
  });

  const shutdown = async (signal) => {
    logger.info(`${signal} received, shutting down gracefully`);

    closeWebSocketServer();

    httpServer.close(async () => {
      await disconnectRedis();
      logger.info("Server shut down complete");
      process.exit(0);
    });

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
