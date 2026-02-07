import { WebSocketServer } from "ws";
import { parse } from "url";
import logger from "../utils/logger.js";
import { handleExecSession } from "./execHandler.js";
import sessionManager from "./sessionManager.js";

let wss = null;

export function initializeWebSocketServer(server) {
    wss = new WebSocketServer({ noServer: true });

    server.on("upgrade", (request, socket, head) => {
        const { pathname } = parse(request.url);

        if (pathname.startsWith("/ws/exec/")) {
            wss.handleUpgrade(request, socket, head, (ws) => {
                wss.emit("connection", ws, request);
            });
        } else {
            socket.destroy();
        }
    });

    wss.on("connection", (ws, request) => {
        const { pathname } = parse(request.url);
        const match = pathname.match(/^\/ws\/exec\/(.+)$/);

        if (!match) {
            logger.warn("Invalid WebSocket path", { pathname });
            ws.close();
            return;
        }

        const containerId = match[1];
        logger.info("WebSocket connection established", { containerId });

        handleExecSession(ws, containerId);
    });

    wss.on("error", (error) => {
        logger.error("WebSocket server error", { error: error.message });
    });

    logger.info("WebSocket server initialized");
}

export function closeWebSocketServer() {
    if (wss) {
        sessionManager.cleanup();

        wss.clients.forEach((client) => {
            if (client.readyState === client.OPEN) {
                client.close();
            }
        });

        wss.close(() => {
            logger.info("WebSocket server closed");
        });
    }
}

export function getWebSocketServer() {
    return wss;
}
