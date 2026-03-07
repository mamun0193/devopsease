import { WebSocketServer } from "ws";
import { parse } from "url";
import jwt from "jsonwebtoken";
import logger from "../utils/logger.js";
import { handleExecSession } from "./execHandler.js";
import execSessionRegistry from "./execSessionRegistry.js";
import { subscribeToBuild } from "./build.socket.js";
import { subscribeToMetrics, stopAllStreams } from "./metricsStreamer.js";
import alertBroadcaster from "./alertBroadcaster.js";
import { enforceRateLimit } from "../middlewares/rateLimit.middleware.js";
import { canPerform, ACTIONS, ROLES } from "../config/permissions.js";
import ownershipService from "../services/ownership.service.js";
import metricsRegistry from "../observability/metricsRegistry.js";
import lifecycle from "../system/lifecycle.js";

let wss = null;

export function initializeWebSocketServer(server) {
    wss = new WebSocketServer({ noServer: true });

    server.on("upgrade", async (request, socket, head) => {
        if (lifecycle.isShuttingDown) {
            logger.warn("WebSocket connection rejected: Server shutting down");
            socket.write('HTTP/1.1 503 Service Unavailable\r\n\r\n');
            socket.destroy();
            return;
        }

        const { pathname } = parse(request.url);

        if (pathname.startsWith("/ws/exec/")) {
            // 1. Authentication (Cookie-based)
            const cookieHeader = request.headers.cookie;
            const token = cookieHeader && cookieHeader.split(';').find(c => c.trim().startsWith('access_token='))?.split('=')[1];

            if (!token) {
                logger.warn("WebSocket connection rejected: No auth token");
                socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
                socket.destroy();
                return;
            }

            let user;
            try {
                user = jwt.verify(token, process.env.JWT_SECRET);
            } catch (err) {
                logger.warn("WebSocket connection rejected: Invalid token");
                socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
                socket.destroy();
                return;
            }

            // RBAC Check 
            const match = pathname.match(/^\/ws\/exec\/(.+)$/);
            if (!match) {
                socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
                socket.destroy();
                return;
            }
            const containerId = match[1];

            let ownsResource = false;

            if (user.role === ROLES.ADMIN) {
                ownsResource = false;
            } else {
                ownsResource = await ownershipService.hasOwnership(user._id || user.userId, containerId);
            }

            const allowed = canPerform({
                role: user.role,
                ownsResource,
                actionType: ACTIONS.OPERATE
            });

            if (!allowed) {
                logger.warn(`WebSocket RBAC Denied: Role ${user.role} tried OPERATE on ${containerId}`);
                socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
                socket.destroy();
                return;
            }

            // 2. Rate Limiting (Exec Action)
            try {
                const userId = user._id || user.userId;
                const userPlan = user.plan || 'free';

                await enforceRateLimit(userId, userPlan, 'exec');

            } catch (error) {
                logger.warn(`WebSocket exec rejected for user ${user._id || user.userId}: ${error.message}`);

                if (error.statusCode === 503) {
                    socket.write('HTTP/1.1 503 Service Unavailable\r\n\r\n');
                } else if (error.statusCode === 429) {
                    socket.write('HTTP/1.1 429 Too Many Requests\r\n\r\n');
                } else {
                    socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
                }
                socket.destroy();
                return;
            }

            // Attach user info to the request for downstream use
            request._user = user;

            // 3. Upgrade Connection
            wss.handleUpgrade(request, socket, head, (ws) => {
                if (lifecycle.isShuttingDown) {
                    ws.close(1001, "Server shutting down");
                    return;
                }
                wss.emit("connection", ws, request);
            });
        } else if (pathname.startsWith("/ws/build/")) {
            const cookieHeader = request.headers.cookie;
            const token = cookieHeader && cookieHeader.split(';').find(c => c.trim().startsWith('access_token='))?.split('=')[1];

            if (!token) {
                socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
                socket.destroy();
                return;
            }

            let user;
            try {
                user = jwt.verify(token, process.env.JWT_SECRET);
            } catch (err) {
                socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
                socket.destroy();
                return;
            }

            request._user = user;
            request._buildPath = true;

            wss.handleUpgrade(request, socket, head, (ws) => {
                if (lifecycle.isShuttingDown) {
                    ws.close(1001, "Server shutting down");
                    return;
                }
                wss.emit("connection", ws, request);
            });
        } else if (pathname.startsWith("/ws/metrics/")) {
            // --- Metrics streaming ---
            const cookieHeader = request.headers.cookie;
            const token = cookieHeader && cookieHeader.split(';').find(c => c.trim().startsWith('access_token='))?.split('=')[1];

            if (!token) {
                socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
                socket.destroy();
                return;
            }

            let user;
            try {
                user = jwt.verify(token, process.env.JWT_SECRET);
            } catch (err) {
                socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
                socket.destroy();
                return;
            }

            const metricsMatch = pathname.match(/^\/ws\/metrics\/(.+)$/);
            if (!metricsMatch) {
                socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
                socket.destroy();
                return;
            }
            const containerId = metricsMatch[1];

            // Ownership check (admins bypass)
            let ownsResource = false;
            if (user.role === ROLES.ADMIN) {
                ownsResource = false;
            } else {
                ownsResource = await ownershipService.hasOwnership(user._id || user.userId, containerId);
            }

            const allowed = canPerform({
                role: user.role,
                ownsResource,
                actionType: ACTIONS.READ,
            });

            if (!allowed) {
                logger.warn(`WebSocket metrics RBAC denied: Role ${user.role} on ${containerId}`);
                socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
                socket.destroy();
                return;
            }

            request._user = user;
            request._metricsPath = true;

            wss.handleUpgrade(request, socket, head, (ws) => {
                if (lifecycle.isShuttingDown) {
                    ws.close(1001, "Server shutting down");
                    return;
                }
                wss.emit("connection", ws, request);
            });
        } else if (pathname === "/ws/alerts") {
            // --- Alert stream ---
            const cookieHeader = request.headers.cookie;
            const token = cookieHeader && cookieHeader.split(';').find(c => c.trim().startsWith('access_token='))?.split('=')[1];

            if (!token) {
                socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
                socket.destroy();
                return;
            }

            let user;
            try {
                user = jwt.verify(token, process.env.JWT_SECRET);
            } catch (err) {
                socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
                socket.destroy();
                return;
            }

            request._user = user;
            request._alertsPath = true;

            wss.handleUpgrade(request, socket, head, (ws) => {
                if (lifecycle.isShuttingDown) {
                    ws.close(1001, "Server shutting down");
                    return;
                }
                wss.emit("connection", ws, request);
            });
        } else {
            socket.destroy();
        }
    });

    wss.on("connection", (ws, request) => {
        metricsRegistry.increment("activeWebSockets");
        let closed = false;

        ws.on("close", () => {
            if (!closed) {
                metricsRegistry.decrement("activeWebSockets");
                closed = true;
            }
        });

        const { pathname } = parse(request.url);

        // Handle metrics subscriptions
        const metricsMatch = pathname.match(/^\/ws\/metrics\/(.+)$/);
        if (metricsMatch && request._metricsPath) {
            const containerId = metricsMatch[1];
            const userId = request._user?._id || request._user?.userId || "unknown";
            logger.info("WebSocket metrics subscription", { containerId, userId });
            subscribeToMetrics(containerId, ws);
            return;
        }

        // Handle alert subscriptions
        if (pathname === "/ws/alerts" && request._alertsPath) {
            const userId = request._user?._id || request._user?.userId;
            if (userId) {
                logger.info("WebSocket alert subscription", { userId });
                alertBroadcaster.register(userId, ws);
            }
            return;
        }

        // Handle build log subscriptions
        const buildMatch = pathname.match(/^\/ws\/build\/(.+)$/);
        if (buildMatch && request._buildPath) {
            const buildId = buildMatch[1];
            const userId = request._user?._id || request._user?.userId || "unknown";
            logger.info("WebSocket build log subscription", { buildId, userId });
            subscribeToBuild(buildId, ws);
            return;
        }

        // Handle exec sessions
        const match = pathname.match(/^\/ws\/exec\/(.+)$/);

        if (!match) {
            logger.warn("Invalid WebSocket path", { pathname });
            ws.close();
            return;
        }

        const containerId = match[1];
        const userId = request._user?._id || request._user?.userId || "unknown";
        logger.info("WebSocket connection established", { containerId, userId });

        handleExecSession(ws, containerId, userId);
    });

    wss.on("error", (error) => {
        logger.error("WebSocket server error", { error: error.message });
    });
}

export async function closeWebSocketServer() {
    if (wss) {
        logger.info("Closing WebSocket server...");

        // 1. Stop all metrics streams
        stopAllStreams();

        // 2. Close all alert broadcaster connections
        alertBroadcaster.closeAll();

        // 3. Terminate all sessions managed by registry (graceful with notification)
        await execSessionRegistry.terminateAllSessions("server_shutdown");

        // 2. Force close any remaining raw connections
        wss.clients.forEach((client) => {
            if (client.readyState === client.OPEN) {
                client.terminate(); // terminate() is more immediate than close() for draining
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
