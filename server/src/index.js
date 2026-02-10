import "dotenv/config";
import express from "express";
import http from "http";
import containersRoutes from "./routes/containers.routes.js";
import healthRoutes from "./routes/health.routes.js";
import analysisRoutes from "./routes/analysis.routes.js";
import actionsRoutes from "./routes/actions.routes.js";
import authRoutes from "./routes/auth.routes.js";
import errorHandler from "./middlewares/errorHandler.js";
import { requireRole } from "./middlewares/rbac.js";
import readinessMiddleware from "./middlewares/readinessMiddleware.js";
import logger from "./utils/logger.js";
import requestLogger from "./middlewares/requestLogger.js";
import cors from "cors";
import cookieParser from "cookie-parser";
import { connectRedis, disconnectRedis } from "./redis/client.js";
import readinessService from "./services/readiness.service.js";
import actionHistoryService from "./services/actionHistory.service.js";
import docker from "./docker/client.js";
import { initializeWebSocketServer, closeWebSocketServer } from "./websocket/ws.js";
import { connectDB, disconnectDB } from "./config/db.js";
import "./config/passport.js";
import passport from "passport";


const PORT = process.env.PORT || 4000;
const app = express();

app.use(passport.initialize());

app.use(
  cors({
    origin: "http://localhost:5173",
  }),
);
app.use(express.json());
app.use(requestLogger);
app.use(cookieParser());
app.use(readinessMiddleware);

app.use("/auth", authRoutes);
app.use(analysisRoutes);
app.use("/health", healthRoutes);
app.use("/containers", containersRoutes);
app.use("/actions", actionsRoutes);

app.use(errorHandler);

async function startServer() {
  await connectDB();
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

  // Correctly create HTTP server to support WebSockets
  const server = http.createServer(app);

  // Initialize WebSocket server with the existing HTTP server instance
  initializeWebSocketServer(server);

  server.listen(PORT, () => {
    logger.info(`DevOpsEase server running on http://localhost:${PORT}`);
    logger.info("Server readiness", readinessService.getStatus());
  });

  const shutdown = async (signal) => {
    logger.info(`${signal} received, shutting down gracefully`);

    closeWebSocketServer();

    server.close(async () => {
      await disconnectDB();
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
