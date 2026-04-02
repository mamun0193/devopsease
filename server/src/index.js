import "dotenv/config";
import express from "express";
import http from "http";
import containersRoutes from "./routes/containers.routes.js";
import healthRoutes from "./routes/health.routes.js";
import metricsRoutes from "./routes/metrics.routes.js";
import analysisRoutes from "./routes/analysis.routes.js";
import actionsRoutes from "./routes/actions.routes.js";
import failureAnalysisRoutes from "./routes/failureAnalysis.routes.js";
import authRoutes from "./routes/auth.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import buildRoutes from "./routes/build.routes.js";
import imageRoutes from "./routes/image.routes.js";
import projectRoutes from "./routes/project.routes.js";
import networkRoutes from "./routes/network.routes.js";
import volumeRoutes from "./routes/volume.routes.js";
import dockerHubRoutes from "./routes/dockerHub.routes.js";
import tunnelRoutes from "./routes/tunnel.routes.js";
import quotaRoutes from "./routes/quota.routes.js";
import containerHealthRoutes from "./routes/containerHealth.routes.js";
import alertRoutes from "./routes/alert.routes.js";
import repositoryRoutes from "./routes/repository.routes.js";
import gitRoutes from "./routes/git.routes.js";
import webhookRoutes from "./routes/webhook.routes.js";
import deploymentRoutes from "./routes/deployment.routes.js";
import clusterRoutes from "./routes/cluster.routes.js";
import errorHandler from "./middlewares/errorHandler.js";
import readinessMiddleware from "./middlewares/readinessMiddleware.js";
import logger from "./utils/logger.js";
import requestLogger from "./middlewares/requestLogger.js";
import cors from "cors";
import cookieParser from "cookie-parser";
import { connectRedis } from "./redis/client.js";
import readinessService from "./services/readiness.service.js";
import actionHistoryService from "./services/actionHistory.service.js";
import docker from "./docker/client.js";
import { initializeWebSocketServer } from "./websocket/ws.js";
import { connectDB } from "./config/db.js";
import "./config/passport.js";
import passport from "passport";
import { validateEnv } from "./config/envValidator.js";
import { initDockerEvents } from "./docker/events.js";
import { gracefulShutdown } from "./shutdownManager.js";
import buildService from "./services/build.service.js";
import imageObservabilityService from "./services/imageObservability.service.js";
import tunnelService from "./services/tunnel.service.js";
import resourceMonitor from "./services/resourceMonitor.service.js";
import metricsAggregator from "./services/metricsAggregator.service.js";
import globalMetricsCollector from "./services/globalMetricsCollector.js";
import collectorWatchdog from "./services/collectorWatchdog.service.js";
import systemRoutes from "./routes/system.routes.js";

// 1. Validate Environment immediately
validateEnv();

let server;

// 2. Global Error Guards
process.on("unhandledRejection", (reason, promise) => {
  logger.error("❌ Unhandled Rejection at:", { promise, reason });
  gracefulShutdown("UNHANDLED_REJECTION", server);
});

process.on("uncaughtException", (error) => {
  logger.error("❌ Uncaught Exception:", { error: error.message, stack: error.stack });
  gracefulShutdown("UNCAUGHT_EXCEPTION", server);
});

const PORT = process.env.PORT || 4000;
const app = express();

app.use(passport.initialize());

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
);
app.use(requestLogger);
app.use("/api/webhooks", webhookRoutes);
app.use(express.json());
app.use(cookieParser());
app.use(readinessMiddleware);

app.use("/auth", authRoutes);
app.use(analysisRoutes);
app.use("/health", healthRoutes);
app.use("/metrics", metricsRoutes);
app.use("/containers", containersRoutes);
app.use("/containers", failureAnalysisRoutes);
app.use("/containers", containerHealthRoutes);
app.use("/alerts", alertRoutes);
app.use("/actions", actionsRoutes);
app.use("/admin", adminRoutes);
app.use("/builds", buildRoutes);
app.use("/images", imageRoutes);
app.use("/projects", projectRoutes);
app.use("/networks", networkRoutes);
app.use("/volumes", volumeRoutes);
app.use("/dockerhub", dockerHubRoutes);
app.use("/tunnels", tunnelRoutes);
app.use("/quota", quotaRoutes);
app.use("/system", systemRoutes);
app.use("/api/repos", repositoryRoutes);
app.use("/api/git", gitRoutes);
app.use("/api/deployments", deploymentRoutes);
app.use("/api/clusters", clusterRoutes);

app.use(errorHandler);

async function startServer() {
  try {
    // Connect services
    await connectDB();
    logger.info("MongoDB connected");

    const redisConnected = await connectRedis();
    logger.info(redisConnected ? "Redis connected — caching enabled" : "Redis unavailable — caching disabled");

    try {
      await docker.ping();
      readinessService.setDockerReady(true);

      // Initialize Docker Events Listener (Resilient)
      initDockerEvents();

      // Reconcile image usage on startup
      imageObservabilityService.reconcileImageUsage().catch((err) => {
        logger.warn("Image reconciliation failed at startup", { error: err.message });
      });

      // Initialize tunnel providers
      await tunnelService.initProviders();

      // Start resource monitor (polls Docker stats every 10s)
      resourceMonitor.start();

      // Start metrics aggregation pipeline (30s→10m→1h + cleanup)
      metricsAggregator.start();

      // Start global metrics collector (always-on, UI-independent, batched collection)
      await globalMetricsCollector.start();

      // Start collector watchdog (auto-restarts if stalled)
      collectorWatchdog.start();

    } catch (error) {
      logger.error("Docker connection failed at startup", { error: error.message });
      // We don't exit here, we run in degraded mode
      readinessService.setDockerReady(false);
    }

    await actionHistoryService.syncFromRedis();
    readinessService.setHistoryReady(true);

    // Recover stale builds from previous server run
    await buildService.recoverStaleBuilds().catch((err) => {
      logger.warn("Stale build recovery failed", { error: err.message });
    });

    server = http.createServer(app);
    initializeWebSocketServer(server);
    logger.info("Docker + WebSocket ready");

    server.listen(PORT, () => {
      logger.info(`DevOpsEase server running on http://localhost:${PORT}`);
    });

    // Tunnel expiry scheduler — runs every 60 seconds, non-blocking
    setInterval(() => {
      tunnelService.expireTunnelsJob().catch((err) => {
        logger.error("Tunnel expiry scheduler error", { error: err.message });
      });
    }, 60_000);

  } catch (err) {
    logger.error("Failed to start server", { error: err.message });
    process.exit(1);
  }
}

// Signal Handlers
process.on("SIGTERM", () => gracefulShutdown("SIGTERM", server));
process.on("SIGINT", () => gracefulShutdown("SIGINT", server));

startServer();
