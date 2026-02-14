import docker from "../docker/client.js";
import logger from "../utils/logger.js";
import execSessionRegistry from "./execSessionRegistry.js";

const SHELL_CONFIGS = [
    { path: "/bin/bash", type: "bash", prompt: "\\u@\\h:\\w\\$ " },
    { path: "/usr/bin/bash", type: "bash", prompt: "\\u@\\h:\\w\\$ " },
    { path: "bash", type: "bash", prompt: "\\u@\\h:\\w\\$ " },
    { path: "/bin/sh", type: "sh", prompt: "$ " },
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

            await exec.start({ Detach: false });
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

export async function handleExecSession(ws, containerId, userId) {
    let session = null;

    try {
        // Terminate any existing sessions for this container from this user
        const existingSessions = execSessionRegistry.getSessionsByContainer(containerId);
        for (const existing of existingSessions) {
            logger.warn("Preempting existing exec session", { sessionId: existing.sessionId, containerId });
            await execSessionRegistry.forceKillSession(existing.sessionId, "session_preempted");
        }

        // Create new session in the registry
        session = execSessionRegistry.createSession({ containerId, userId, ws });
        const { sessionId } = session;

        // Validate container state
        const state = await getContainerState(containerId);

        if (!state) {
            ws.send(JSON.stringify({ type: "error", message: "Container not found" }));
            await execSessionRegistry.terminateSession(sessionId, "container_not_found");
            return;
        }

        if (!state.running) {
            ws.send(JSON.stringify({ type: "error", message: `Container is ${state.state}. Only running containers can execute shell` }));
            await execSessionRegistry.terminateSession(sessionId, "container_not_running");
            return;
        }

        if (state.paused) {
            ws.send(JSON.stringify({ type: "error", message: "Container is paused. Unpause to execute shell" }));
            await execSessionRegistry.terminateSession(sessionId, "container_paused");
            return;
        }

        // Find available shell (bash only)
        const container = docker.getContainer(containerId);
        const shellConfig = await findAvailableShell(container);

        // Check session is still active (not preempted during async work)
        const currentSession = execSessionRegistry.getSession(sessionId);
        if (!currentSession || currentSession.status !== "active") {
            logger.debug("Session preempted during initialization", { sessionId });
            return;
        }

        const env = [
            `TERM=xterm-256color`,
            `PS1=${shellConfig.prompt}`,
            `HOME=/root`,
            `SHELL=${shellConfig.path}`,
        ];

        const exec = await container.exec({
            Cmd: [shellConfig.path, "-l", "-i"],
            AttachStdin: true,
            AttachStdout: true,
            AttachStderr: true,
            Tty: true,
            Env: env,
        });

        const execStream = await exec.start({
            hijack: true,
            stdin: true,
            Tty: true,
        });

        // Check session is still active after exec start
        const activeSession = execSessionRegistry.getSession(sessionId);
        if (!activeSession || activeSession.status !== "active") {
            logger.warn("Session preempted during exec start", { sessionId });
            try { execStream.destroy(); } catch (_) { /* ignore */ }
            return;
        }

        // Attach Docker resources to session
        activeSession.dockerStream = execStream;
        activeSession.dockerExecInstance = exec;

        logger.info("Exec session started", { sessionId, containerId, shell: shellConfig.path });

        ws.send(JSON.stringify({
            type: "connected",
            message: `Connected to ${state.name} (${shellConfig.path})`,
            sessionId,
        }));

        // Docker stream → WebSocket
        execStream.on("data", (data) => {
            execSessionRegistry.updateLastIO(sessionId);
            try {
                if (ws.readyState === ws.OPEN) {
                    ws.send(JSON.stringify({
                        type: "output",
                        data: data.toString("utf-8"),
                    }));
                }
            } catch (error) {
                logger.error("Error sending output to WebSocket", { sessionId, error: error.message });
            }
        });

        execStream.on("end", () => {
            logger.info("Exec stream ended", { sessionId });
            execSessionRegistry.terminateSession(sessionId, "stream_ended").catch((err) => {
                logger.error("Error during stream end cleanup", { sessionId, error: err.message });
            });
        });

        execStream.on("error", (error) => {
            logger.error("Exec stream error", { sessionId, error: error.message });
            execSessionRegistry.terminateSession(sessionId, "stream_error").catch((err) => {
                logger.error("Error during stream error cleanup", { sessionId, error: err.message });
            });
        });

        // WebSocket → Docker stream
        ws.on("message", (message) => {
            try {
                const data = JSON.parse(message);

                if (data.type === "input") {
                    const currentSess = execSessionRegistry.getSession(sessionId);
                    if (currentSess?.dockerStream && !currentSess.dockerStream.destroyed) {
                        currentSess.dockerStream.write(data.data);
                        execSessionRegistry.updateLastIO(sessionId);
                    }
                } else if (data.type === "resize") {
                    const currentSess = execSessionRegistry.getSession(sessionId);
                    const { cols, rows } = data;
                    if (cols && rows && currentSess?.dockerExecInstance) {
                        currentSess.dockerExecInstance.resize({ h: rows, w: cols }).catch(() => { });
                    }
                } else if (data.type === "terminate") {
                    logger.info("Client requested session termination", { sessionId });
                    execSessionRegistry.terminateSession(sessionId, "manual_termination").catch((err) => {
                        logger.error("Error during manual termination", { sessionId, error: err.message });
                    });
                }
            } catch (error) {
                logger.error("Error processing WebSocket message", { sessionId, error: error.message });
            }
        });

        ws.on("close", () => {
            logger.info("WebSocket closed by client", { sessionId });
            execSessionRegistry.terminateSession(sessionId, "client_disconnected").catch((err) => {
                logger.error("Error during client disconnect cleanup", { sessionId, error: err.message });
            });
        });

        ws.on("error", (error) => {
            logger.error("WebSocket error", { sessionId, error: error.message });
            execSessionRegistry.terminateSession(sessionId, "websocket_error").catch((err) => {
                logger.error("Error during WebSocket error cleanup", { sessionId, error: err.message });
            });
        });

    } catch (error) {
        logger.error("Failed to create exec session", { containerId, error: error.message });

        if (session) {
            await execSessionRegistry.forceKillSession(session.sessionId, "initialization_error").catch((err) => {
                logger.error("Error during init error cleanup", { error: err.message });
            });
        }

        if (ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify({
                type: "error",
                message: `Failed to create exec session: ${error.message}`,
            }));
            ws.close();
        }
    }
}
