import { WebSocketServer } from "ws";
import { parse } from "url";
import jwt from "jsonwebtoken"; // Added for auth
import logger from "../utils/logger.js";
import { handleExecSession } from "./execHandler.js";
import sessionManager from "./sessionManager.js";
import { enforceRateLimit } from "../middlewares/rateLimit.middleware.js"; // Added for rate limiting
import { canPerform, ACTIONS, ROLES } from "../config/permissions.js"; // Added for RBAC
import ownershipService from "../services/ownership.service.js"; // Added for ownership check

let wss = null;

export function initializeWebSocketServer(server) {
    wss = new WebSocketServer({ noServer: true });

    server.on("upgrade", async (request, socket, head) => {
        const { pathname } = parse(request.url);

        if (pathname.startsWith("/ws/exec/")) {
            // 1. Authentication (Cookie-based)
            const cookieHeader = request.headers.cookie;
            // Simple parsing for 'auth' cookie
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

            // Determines if user strictly owns the resource
            let ownsResource = false;

            if (user.role === ROLES.ADMIN) {
                ownsResource = false; // Admins rely on role permission (ANY), not ownership
            } else {
                ownsResource = await ownershipService.hasOwnership(user._id || user.userId, containerId);
            }

            const allowed = canPerform({
                role: user.role,
                ownsResource,
                actionType: ACTIONS.OPERATE // Exec is always OPERATE
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
                const userPlan = user.plan || 'free'; // Default to free if missing in token

                // This throws if limit exceeded (429) or Redis down (503)
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

            // 3. Upgrade Connection
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

    // WebSocket initialized
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
