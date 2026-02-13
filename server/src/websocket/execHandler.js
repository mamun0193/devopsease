import docker from "../docker/client.js";
import logger from "../utils/logger.js";
import sessionManager from "./sessionManager.js";

const SHELL_CONFIGS = [
    { path: "/bin/bash", type: "bash", prompt: "\\u@\\h:\\w\\$ " },
    { path: "/usr/bin/bash", type: "bash", prompt: "\\u@\\h:\\w\\$ " },
    { path: "bash", type: "bash", prompt: "\\u@\\h:\\w\\$ " },
    { path: "/bin/sh", type: "sh", prompt: "$ " },
    { path: "sh", type: "sh", prompt: "$ " }
];

async function getContainerState(containerId) {
    try {
        const container = docker.getContainer(containerId);
        const inspectData = await container.inspect();

        return {
            id: inspectData.Id.substring(0, 12),
            name: inspectData.Name.replace("/", ""),
            state: inspectData.State.Status,
            running: inspectData.State.Running,
            paused: inspectData.State.Paused,
            dead: inspectData.State.Dead,
        };
    } catch (error) {
        if (error.statusCode === 404) {
            return null;
        }
        throw error;
    }
}

async function findAvailableShell(container) {
    for (const shell of SHELL_CONFIGS) {
        try {
            const exec = await container.exec({
                Cmd: ["test", "-x", shell.path],
                AttachStdout: false,
                AttachStderr: false,
            });

            const result = await exec.start({ Detach: false });
            const inspection = await exec.inspect();

            if (inspection.ExitCode === 0) {
                logger.info("Found available shell", { shell: shell.path, type: shell.type });
                return shell;
            }
        } catch (error) {
            logger.debug("Shell not available", { shell: shell.path, error: error.message });
        }
    }

    logger.warn("No standard shell found, defaulting to /bin/sh");
    return { path: "/bin/sh", type: "sh", prompt: "$ " };
}

export async function handleExecSession(ws, containerId) {
    let execStream = null;
    let exec = null;
    let cleanedUp = false;
    let currentSession = null;

    const cleanup = () => {
        if (cleanedUp) return;
        cleanedUp = true;

        try {
            if (execStream) {
                execStream.destroy();
                execStream = null;
            }
            // Only remove from session manager if WE are the active session
            const activeSession = sessionManager.getSession(containerId);
            if (activeSession === currentSession) {
                sessionManager.removeSession(containerId);
                logger.info("Exec session cleaned up", { containerId });
            }
        } catch (error) {
            logger.error("Error during exec cleanup", { containerId, error: error.message });
        }
    };

    try {
        // 1. Force cleanup of any existing session (preemption)
        // Atomic session creation: Force create a new session, getting back any old one
        const { session, previousSession } = sessionManager.forceCreateSession(containerId, {
            ws,
            status: "initializing",
            startTime: new Date().toISOString()
        });

        currentSession = session;

        // Clean up the previous session if one existed
        if (previousSession) {
            logger.warn("Cleaning up preempted session", { containerId });
            try {
                if (previousSession.stream) previousSession.stream.destroy();
                if (previousSession.ws && previousSession.ws.readyState === previousSession.ws.OPEN) {
                    previousSession.ws.close();
                }
            } catch (e) {
                logger.debug("Error cleaning preempted session", { containerId, error: e.message });
            }
        }

        const state = await getContainerState(containerId);

        // CHECK: Have we been preempted?
        if (sessionManager.getSession(containerId) !== currentSession) {
            logger.debug("Session initialization preempted by new connection", { containerId });
            return; // Stop silently, new connection will take over
        }

        if (!state) {
            ws.send(JSON.stringify({ type: "error", message: "Container not found" }));
            ws.close();
            return;
        }

        if (!state.running) {
            ws.send(JSON.stringify({ type: "error", message: `Container is ${state.state}. Only running containers can execute shell` }));
            ws.close();
            return;
        }

        if (state.paused) {
            ws.send(JSON.stringify({ type: "error", message: "Container is paused. Unpause to execute shell" }));
            ws.close();
            return;
        }

        const container = docker.getContainer(containerId);
        const shellConfig = await findAvailableShell(container);

        // CHECK: Have we been preempted?
        if (sessionManager.getSession(containerId) !== currentSession) {
            logger.debug("Session initialization preempted by new connection", { containerId });
            return;
        }

        // Env variables based on shell type
        const env = [
            `TERM=xterm-256color`,
            `PS1=${shellConfig.prompt}`,
            `HOME=/root`,
            `SHELL=${shellConfig.path}`,
        ];

        exec = await container.exec({
            // Use login shell (-l) and interactive (-i) for proper environment loading
            Cmd: [shellConfig.path, "-l", "-i"],
            AttachStdin: true,
            AttachStdout: true,
            AttachStderr: true,
            Tty: true,
            Env: env,
        });

        execStream = await exec.start({
            hijack: true,
            stdin: true,
            Tty: true,
        });

        // Update the reserved session with actual exec data
        // Check if we are still the active session before updating
        if (sessionManager.getSession(containerId) === currentSession) {
            Object.assign(currentSession, {
                shell: shellConfig.path,
                exec,
                stream: execStream,
                status: "active"
            });
        } else {
            logger.warn("Session preempted during start, aborting update", { containerId });
            return;
        }

        logger.info("Exec session started", { containerId, shell: shellConfig.path });

        ws.send(JSON.stringify({
            type: "connected",
            message: `Connected to ${state.name} (${shellConfig.path})`
        }));

        execStream.on("data", (data) => {
            try {
                if (ws.readyState === ws.OPEN) {
                    ws.send(JSON.stringify({
                        type: "output",
                        data: data.toString("utf-8")
                    }));
                }
            } catch (error) {
                logger.error("Error sending output to WebSocket", { containerId, error: error.message });
            }
        });

        execStream.on("end", () => {
            logger.info("Exec stream ended", { containerId });
            cleanup();
            if (ws.readyState === ws.OPEN) {
                ws.send(JSON.stringify({
                    type: "disconnected",
                    message: "Exec session ended"
                }));
                ws.close();
            }
        });

        execStream.on("error", (error) => {
            logger.error("Exec stream error", { containerId, error: error.message });
            cleanup();
            if (ws.readyState === ws.OPEN) {
                ws.send(JSON.stringify({
                    type: "error",
                    message: `Stream error: ${error.message}`
                }));
                ws.close();
            }
        });

        ws.on("message", (message) => {
            try {
                const data = JSON.parse(message);

                if (data.type === "input" && execStream && !execStream.destroyed) {
                    execStream.write(data.data);
                } else if (data.type === "resize" && exec) {
                    const { cols, rows } = data;
                    if (cols && rows) {
                        exec.resize({ h: rows, w: cols }).catch(() => { });
                    }
                }
            } catch (error) {
                logger.error("Error processing WebSocket message", { containerId, error: error.message });
            }
        });

        ws.on("close", () => {
            logger.info("WebSocket closed by client", { containerId });
            cleanup();
        });

        ws.on("error", (error) => {
            logger.error("WebSocket error", { containerId, error: error.message });
            cleanup();
        });

    } catch (error) {
        logger.error("Failed to create exec session", { containerId, error: error.message });

        // Remove session if it's ours
        if (currentSession && sessionManager.getSession(containerId) === currentSession) {
            sessionManager.removeSession(containerId);
        }

        cleanup();

        if (ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify({
                type: "error",
                message: `Failed to create exec session: ${error.message}`
            }));
            ws.close();
        }
    }
}
