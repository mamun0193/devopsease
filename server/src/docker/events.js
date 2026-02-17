import docker from "./client.js";
import logger from "../utils/logger.js";
import lifecycle from "../system/lifecycle.js";

let eventStream = null;
let reconnectTimeout = null;
let backoffMs = 1000;
const MAX_BACKOFF_MS = 30000;

export async function initDockerEvents() {
    if (lifecycle.isShuttingDown) {
        logger.warn("Skipping Docker events init - System is shutting down");
        return;
    }

    cleanup(); // Ensure single instance

    try {
        logger.info("Initializing Docker event listener...");

        const stream = await docker.getEvents();
        eventStream = stream;

        // Reset backoff on successful connection (after a short delay to ensure stability)
        setTimeout(() => {
            if (eventStream === stream) {
                backoffMs = 1000;
            }
        }, 5000);

        stream.on("data", (chunk) => {
            try {
                const event = JSON.parse(chunk.toString());
                // logger.debug("Docker event", { Type: event.Type, Action: event.Action, id: event.id });
            } catch (err) {
                logger.error("Error parsing Docker event chunk", { error: err.message });
            }
        });

        stream.on("error", (err) => {
            logger.error("Docker event stream error", { error: err.message });
            handleReconnect();
        });

        stream.on("end", () => {
            logger.warn("Docker event stream ended unexpected");
            handleReconnect();
        });

        logger.info("Docker event listener started");

    } catch (err) {
        logger.error("Failed to initialize Docker events", { error: err.message });
        handleReconnect();
    }
}

function handleReconnect() {
    if (lifecycle.isShuttingDown) return;

    cleanup();

    logger.info(`Reconnecting Docker events in ${backoffMs}ms...`);

    reconnectTimeout = setTimeout(() => {
        initDockerEvents();
        backoffMs = Math.min(backoffMs * 2, MAX_BACKOFF_MS);
    }, backoffMs);
}

function cleanup() {
    if (eventStream) {
        try {
            eventStream.destroy();
        } catch (err) { /* ignore */ }
        eventStream = null;
    }

    if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
    }
}

export function stopDockerEvents() {
    logger.info("Stopping Docker event listener");
    cleanup();
}
