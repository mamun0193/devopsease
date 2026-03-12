import logger from "./utils/logger.js";
import lifecycle from "./system/lifecycle.js";
import { stopDockerEvents } from "./docker/events.js";
import { closeWebSocketServer } from "./websocket/ws.js";
import { disconnectRedis } from "./redis/client.js";
import { disconnectDB } from "./config/db.js";
import metricsAggregator from "./services/metricsAggregator.service.js";
import globalMetricsCollector from "./services/globalMetricsCollector.js";
import collectorWatchdog from "./services/collectorWatchdog.service.js";

let shutdownInProgress = false;

export async function gracefulShutdown(signal, server) {
    if (shutdownInProgress) return;
    shutdownInProgress = true;

    logger.info(`${signal} received, starting graceful shutdown...`);

    // 1. Set global state
    lifecycle.setShuttingDown(true);

    // 2. Safety Timeout
    const timeout = setTimeout(() => {
        logger.error("⚠️ Forced shutdown after timeout");
        process.exit(1);
    }, 10000); // 10s strict timeout

    try {
        // 3. Stop Docker Event Listener
        stopDockerEvents();

        // 4. Stop metrics aggregation pipeline
        metricsAggregator.stop();

        // 4b. Stop collector watchdog
        collectorWatchdog.stop();

        // 4c. Stop global metrics collector
        globalMetricsCollector.stop();

        // 5. Terminate WebSockets (Drain logic)
        await closeWebSocketServer();

        // 5. Close HTTP Server
        if (server) {
            await new Promise((resolve) => server.close(resolve));
            logger.info("HTTP server closed");
        }

        // 6. Close Database Connections
        await disconnectRedis();
        await disconnectDB();

        logger.info("Graceful shutdown complete");
        clearTimeout(timeout);
        process.exit(0);

    } catch (err) {
        logger.error("Error during shutdown", { error: err.message });
        process.exit(1);
    }
}
