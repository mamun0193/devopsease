import "dotenv/config";
import express from "express";
import http from "http";
import containersRoutes from "./routes/containers.routes.js";
import healthRoutes from "./routes/health.routes.js";
import metricsRoutes from "./routes/metrics.routes.js";
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
    credentials: true,
  }),
);
app.use(express.json());
app.use(requestLogger);
app.use(cookieParser());
app.use(readinessMiddleware);

app.use("/auth", authRoutes);
app.use(analysisRoutes);
app.use("/health", healthRoutes);
app.use("/metrics", metricsRoutes);
app.use("/containers", containersRoutes);
app.use("/actions", actionsRoutes);

app.use(errorHandler);

async function startServer() {
  // Connect services
  await connectDB();
  logger.info("MongoDB connected");

  const redisConnected = await connectRedis();
  logger.info(redisConnected ? "Redis connected — caching enabled" : "Redis unavailable — caching disabled");

  try {
    await docker.ping();
    readinessService.setDockerReady(true);
  } catch (error) {
    logger.error("Docker connection failed", { error: error.message });
    readinessService.setDockerReady(false);
  }

  await actionHistoryService.syncFromRedis();
  readinessService.setHistoryReady(true);

  const server = http.createServer(app);
  initializeWebSocketServer(server);
  logger.info("Docker + WebSocket ready");

  server.listen(PORT, () => {
    logger.info(`DevOpsEase server running on http://localhost:${PORT}`);
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
