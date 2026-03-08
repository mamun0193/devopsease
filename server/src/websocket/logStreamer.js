import docker from "../docker/client.js";
import logger from "../utils/logger.js";

/**
 * Stream Docker container logs via WebSocket using `docker logs -f`.
 * Sends each log chunk as a JSON message: { type: "log_line", data: "<line>" }
 * Sends { type: "log_end" } when the stream closes.
 *
 * @param {string} containerId
 * @param {WebSocket} ws
 * @param {object} [options]
 * @param {number} [options.tail=200] - number of initial lines
 * @param {number} [options.since] - Unix timestamp
 */
export async function streamContainerLogs(containerId, ws, options = {}) {
    const { tail = 200, since } = options;

    let logStream = null;

    try {
        const container = docker.getContainer(containerId);

        const logOpts = {
            follow: true,
            stdout: true,
            stderr: true,
            tail,
            timestamps: true,
        };

        if (since) {
            logOpts.since = since;
        }

        logStream = await container.logs(logOpts);

        let buffer = "";

        logStream.on("data", (chunk) => {
            try {
                if (ws.readyState !== ws.OPEN) {
                    logStream.destroy();
                    return;
                }

                // Docker multiplexed stream: first 8 bytes are header (stream type + size)
                // For simplicity, convert to string and split by newline
                buffer += chunk.toString("utf8");
                const lines = buffer.split("\n");
                buffer = lines.pop() || ""; // keep incomplete last line in buffer

                for (const line of lines) {
                    if (line.trim()) {
                        ws.send(JSON.stringify({ type: "log_line", data: line }));
                    }
                }
            } catch (err) {
                logger.debug("Log stream data handler error", { containerId, error: err.message });
            }
        });

        logStream.on("end", () => {
            try {
                if (ws.readyState === ws.OPEN) {
                    // Flush remaining buffer
                    if (buffer.trim()) {
                        ws.send(JSON.stringify({ type: "log_line", data: buffer }));
                    }
                    ws.send(JSON.stringify({ type: "log_end" }));
                }
            } catch (_) { /* ignore */ }
        });

        logStream.on("error", (err) => {
            logger.warn("Log stream error", { containerId, error: err.message });
            try {
                if (ws.readyState === ws.OPEN) {
                    ws.send(JSON.stringify({ type: "log_error", message: err.message }));
                }
            } catch (_) { /* ignore */ }
        });

        // When the WebSocket client disconnects, destroy the Docker log stream
        ws.on("close", () => {
            if (logStream) {
                try { logStream.destroy(); } catch (_) { /* ignore */ }
            }
            logger.debug("Log stream WebSocket closed", { containerId });
        });

        logger.info("Log stream started", { containerId, tail });

    } catch (err) {
        logger.error("Failed to start log stream", { containerId, error: err.message });
        try {
            if (ws.readyState === ws.OPEN) {
                ws.send(JSON.stringify({ type: "log_error", message: err.message }));
                ws.close(1011, "Log stream initialization failed");
            }
        } catch (_) { /* ignore */ }
    }
}
