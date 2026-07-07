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
import k8sRoutes from "./routes/k8s.routes.js";
import pipelineRoutes from "./routes/pipeline.routes.js";
import pipelineRunRoutes from "./routes/pipelineRun.routes.js";
import secretRoutes from "./routes/secret.routes.js";
import envManagementRoutes from "./routes/envManagement.routes.js";
import intelligenceRoutes from "./routes/intelligence.routes.js";
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
import { storageService } from "./storage/storage.service.js";
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
import applicationRoutes from "./routes/application.routes.js";
import gatewayRoutes from "./routes/gateway.routes.js";
import gatewayService from "./gateway/gateway.service.js";
import releaseRoutes from "./routes/release.routes.js";
import trafficRoutes from "./routes/traffic.routes.js";
import previewRoutes from "./routes/preview.routes.js";
import resilienceRoutes from "./routes/resilience.routes.js";
import platformScheduler from "./system/platformScheduler.js";
import backupService from "./resilience/backup.service.js";
import previewService from "./services/preview.service.js";
import domainRoutes from "./routes/domain.routes.js";
import domainService from "./services/domain.service.js";
import certificateService from "./services/certificate.service.js";
import domainHealthService from "./services/domainHealth.service.js";
import observabilityRoutes from "./routes/observability.routes.js";
import autopilotRoutes from "./routes/autopilot.routes.js";
import platformEventBus from "./events/platformEventBus.js";
import { platformHealthJob, eventCleanupJob, initEventPersistence, checkGatewayThresholds } from "./observability/platformHealth.service.js";
import autopilotService from "./autopilot/autopilot.service.js";
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

// ─── Primary API routes (canonical /api/ prefix) ─────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/containers", containersRoutes);
app.use("/api/containers", failureAnalysisRoutes);
app.use("/api/containers", containerHealthRoutes);
app.use("/api/containers", analysisRoutes);
app.use("/api/health", healthRoutes);
app.use("/api/metrics", metricsRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/actions", actionsRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/builds", buildRoutes);
app.use("/api/images", imageRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/networks", networkRoutes);
app.use("/api/volumes", volumeRoutes);
app.use("/api/dockerhub", dockerHubRoutes);
app.use("/api/tunnels", tunnelRoutes);
app.use("/api/quota", quotaRoutes);
app.use("/api/system", systemRoutes);
app.use("/api/system", intelligenceRoutes);
app.use("/api/repos", repositoryRoutes);
app.use("/api/git", gitRoutes);
app.use("/api/deployments", deploymentRoutes);
app.use("/api/clusters", clusterRoutes);
app.use("/api/k8s", k8sRoutes);
app.use("/api/pipelines", pipelineRoutes);
app.use("/api/pipeline-runs", pipelineRunRoutes);
app.use("/api/secrets", secretRoutes);
app.use("/api/config", envManagementRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/releases", releaseRoutes);
app.use("/api/traffic", trafficRoutes);
app.use("/api/previews", previewRoutes);
app.use("/api/resilience", resilienceRoutes);
app.use("/api/domains", domainRoutes);
app.use("/api/observability", observabilityRoutes);
app.use("/api/autopilot", autopilotRoutes);

// ─── Backward-compat aliases (old bare paths → same routers) ─────────────────
// These keep existing frontend and CLI working without changes.
// TODO: Migrate frontend to /api/... and remove these aliases.
app.use("/auth", authRoutes);
app.use("/containers", containersRoutes);
app.use("/containers", failureAnalysisRoutes);
app.use("/containers", containerHealthRoutes);
app.use(analysisRoutes);
app.use("/health", healthRoutes);
app.use("/metrics", metricsRoutes);
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
app.use("/releases", releaseRoutes);
app.use("/traffic", trafficRoutes);

// Application Gateway (proxy) 
app.use("/apps", gatewayRoutes);

app.use(errorHandler);

async function startServer() {
  try {
    // 3. Initialize Storage Provider (Fail Fast)
    await storageService.init();

    // Connect services
    await connectDB();
    logger.info("MongoDB connected");

    const redisConnected = await connectRedis();
    logger.info(redisConnected ? "Redis connected — caching enabled" : "Redis unavailable — caching disabled");

    // Initialize unified event bus (depends on Redis)
    await platformEventBus.init();
    initEventPersistence();

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

    // Gateway WebSocket upgrade handler for /apps/:slug/* paths
    server.on('upgrade', (req, socket, head) => {
      if (req.url && req.url.startsWith('/apps/')) {
        gatewayService.handleWsUpgrade(req, socket, head);
        return;
      }
      // Other WS upgrades are handled by the existing WS server
    });

    logger.info("Docker + WebSocket + Gateway ready");

    server.listen(PORT, () => {
      logger.info(`DevOpsEase server running on http://localhost:${PORT}`);
    });

    // Platform Scheduler — background jobs
    platformScheduler.register('tunnel:expiry', () => tunnelService.expireTunnelsJob(), 60_000);
    platformScheduler.register('preview:expiry', () => previewService.runExpiryJob(), 5 * 60_000);
    platformScheduler.register('domain:verification-check', () => domainService.runVerificationJob(), 2 * 60_000);
    platformScheduler.register('domain:health-check', () => domainHealthService.runHealthCheckJob(), 5 * 60_000);
    platformScheduler.register('certificate:renewal', () => certificateService.runRenewalJob(), 60 * 60_000);
    platformScheduler.register('certificate:expiry', () => certificateService.runExpiryJob(), 6 * 60 * 60_000);

    // Observability scheduler jobs
    platformScheduler.register('observability:health-evaluation', async () => { checkGatewayThresholds(); await platformHealthJob(); }, 30_000);
    platformScheduler.register('observability:event-cleanup', () => eventCleanupJob(), 6 * 60 * 60_000);

    // Autopilot scheduler job
    platformScheduler.register('autopilot:evaluate', () => autopilotService.evaluate(), 15_000);

    // Resilience & Security Center
    platformScheduler.register('backup:daily', () => backupService.runDailyBackup(), 24 * 60 * 60_000);
    platformScheduler.register('backup:retention', () => backupService.runRetentionCleanup(), 6 * 60 * 60_000);

    logger.info("Global scheduler registered.");
  } catch (err) {
    logger.error("Failed to start server", { error: err.message });
    process.exit(1);
  }
}

// Signal Handlers
process.on("SIGTERM", () => gracefulShutdown("SIGTERM", server));
process.on("SIGINT", () => gracefulShutdown("SIGINT", server));

startServer();
