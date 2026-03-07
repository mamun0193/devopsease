import docker from "./client.js";
import logger from "../utils/logger.js";
import actionHistoryService from "../services/actionHistory.service.js";
import containerCacheService from "../services/containerCache.service.js";
import execSessionRegistry from "../websocket/execSessionRegistry.js";
import { safeDockerCall } from "./safeCall.js";

/**
 * Get container current state
 * Returns state info or null if container not found
 */
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
      restarting: inspectData.State.Restarting,
      dead: inspectData.State.Dead,
    };
  } catch (error) {
    if (error.statusCode === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * Wait for container to reach expected state
 * Polls every 500ms up to maxAttempts
 */
async function waitForContainerState(containerId, expectedState, maxAttempts = 20) {
  const pollInterval = 500; // 500ms between checks

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const currentState = await getContainerState(containerId);

      if (!currentState) {
        // Container removed
        return expectedState === null;
      }

      if (currentState.state.toLowerCase() === expectedState.toLowerCase()) {
        logger.info("Container reached expected state", {
          containerId,
          expectedState,
          attempts: attempt + 1
        });
        return true;
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    } catch (error) {
      logger.warn("Error checking container state", { containerId, error: error.message });
    }
  }

  logger.warn("Timeout waiting for container state", { containerId, expectedState, maxAttempts });
  return false; // Timeout
}

/**
 * Start a stopped container
 * Validates state before starting
 */
async function startContainer(containerId) {
  logger.info("Container start requested", { containerId });

  // Check current state
  const state = await getContainerState(containerId);

  if (!state) {
    logger.warn("Container not found", { containerId });
    return {
      success: false,
      statusCode: 404,
      data: null,
      message: `Container ${containerId} not found`,
    };
  }

  // Validate state transition
  if (state.paused) {
    logger.warn("Container is paused", { containerId });
    return {
      success: false,
      statusCode: 400,
      data: { containerId: state.id, currentState: "paused" },
      message: "Cannot start a paused container. Use unpause instead",
    };
  }

  if (state.running) {
    logger.warn("Container already running", { containerId, state: state.state });
    return {
      success: false,
      statusCode: 400,
      data: { containerId: state.id, currentState: state.state },
      message: "Cannot start container because it is already running",
    };
  }

  if (state.restarting) {
    logger.warn("Container is restarting", { containerId });
    return {
      success: false,
      statusCode: 400,
      data: { containerId: state.id, currentState: "restarting" },
      message: "Container is already restarting",
    };
  }

  // Perform start action
  try {
    const container = docker.getContainer(containerId);
    await container.start();

    logger.info("Container start command completed", { containerId });

    // Wait for container to reach running state
    const stateReached = await waitForContainerState(containerId, "running", 20);

    // Invalidate cache after state change
    containerCacheService.invalidateContainer(state.id);

    // Record action ONLY after state is confirmed
    await actionHistoryService.recordAction({
      containerId: state.id,
      containerName: state.name,
      action: "start",
      status: "success",
      reason: `Started from ${state.state} state`,
      source: "user",
    });

    logger.info("Container started and confirmed", { containerId, stateReached });

    return {
      success: true,
      statusCode: 200,
      data: {
        containerId: state.id,
        action: "start",
        previousState: state.state,
        currentState: "running",
      },
      message: "Container started successfully",
    };
  } catch (error) {
    logger.error("Failed to start container", { containerId, error: error.message });

    // Record or update to FAILED
    actionHistoryService.recordAction({
      containerId: state.id,
      containerName: state.name,
      action: "start",
      status: "failed",
      reason: error.message,
      source: "user",
    });

    return {
      success: false,
      statusCode: 500,
      data: null,
      message: `Failed to start container: ${error.message}`,
    };
  }
}

/**
 * Stop a running container
 * Validates state before stopping
 */
async function stopContainer(containerId) {
  logger.info("Container stop requested", { containerId });

  // Check current state
  const state = await getContainerState(containerId);

  if (!state) {
    logger.warn("Container not found", { containerId });
    return {
      success: false,
      statusCode: 404,
      data: null,
      message: `Container ${containerId} not found`,
    };
  }

  // Validate state transition
  if (!state.running && state.state === "exited") {
    logger.warn("Container already stopped", { containerId, state: state.state });
    return {
      success: false,
      statusCode: 400,
      data: { containerId: state.id, currentState: state.state },
      message: "Cannot stop container because it is already stopped",
    };
  }

  if (state.dead) {
    logger.warn("Container is dead", { containerId });
    return {
      success: false,
      statusCode: 400,
      data: { containerId: state.id, currentState: "dead" },
      message: "Cannot stop a dead container",
    };
  }

  // Perform stop action
  try {
    const container = docker.getContainer(containerId);
    // Graceful shutdown with 10 second timeout
    await container.stop({ t: 10 });

    logger.info("Container stop command completed", { containerId });

    // Clean up any active exec sessions for this container
    const stopSessions = execSessionRegistry.getSessionsByContainer(containerId)
      .concat(execSessionRegistry.getSessionsByContainer(state.id));
    for (const s of stopSessions) {
      await execSessionRegistry.forceKillSession(s.sessionId, "container_stopped").catch((e) => {
        logger.debug("Error cleaning exec session on stop", { error: e.message });
      });
    }

    // Wait for container to reach exited state
    const stateReached = await waitForContainerState(containerId, "exited", 20);

    // Invalidate cache after state change
    containerCacheService.invalidateContainer(state.id);

    // Record action ONLY after state is confirmed
    await actionHistoryService.recordAction({
      containerId: state.id,
      containerName: state.name,
      action: "stop",
      status: "success",
      reason: `Gracefully stopped from ${state.state} state`,
      source: "user",
    });

    logger.info("Container stopped and confirmed", { containerId, stateReached });

    return {
      success: true,
      statusCode: 200,
      data: {
        containerId: state.id,
        action: "stop",
        previousState: state.state,
        currentState: "exited",
      },
      message: "Container stopped successfully",
    };
  } catch (error) {
    // Docker returns 304 if container is already stopped
    if (error.statusCode === 304) {
      logger.info("Container already stopped", { containerId });
      return {
        success: false,
        statusCode: 400,
        data: { containerId: state.id, currentState: "exited" },
        message: "Container is already stopped",
      };
    }

    logger.error("Failed to stop container", { containerId, error: error.message });

    // Record FAILED action
    actionHistoryService.recordAction({
      containerId: state.id,
      containerName: state.name,
      action: "stop",
      status: "failed",
      reason: error.message,
      source: "user",
    });

    return {
      success: false,
      statusCode: 500,
      data: null,
      message: `Failed to stop container: ${error.message}`,
    };
  }
}

/**
 * Restart a container (stop + start)
 * Works on both running and stopped containers
 */
async function restartContainer(containerId) {
  logger.info("Container restart requested", { containerId });

  // Check current state
  const state = await getContainerState(containerId);

  if (!state) {
    logger.warn("Container not found", { containerId });
    return {
      success: false,
      statusCode: 404,
      data: null,
      message: `Container ${containerId} not found`,
    };
  }

  // Validate state
  if (state.dead) {
    logger.warn("Container is dead", { containerId });
    return {
      success: false,
      statusCode: 400,
      data: { containerId: state.id, currentState: "dead" },
      message: "Cannot restart a dead container",
    };
  }

  if (state.restarting) {
    logger.warn("Container already restarting", { containerId });
    return {
      success: false,
      statusCode: 400,
      data: { containerId: state.id, currentState: "restarting" },
      message: "Container is already restarting",
    };
  }

  // Perform restart action
  try {
    const container = docker.getContainer(containerId);
    // Restart with 10 second timeout
    await container.restart({ t: 10 });

    logger.info("Container restart command completed", { containerId });

    // Clean up any active exec sessions for this container (restart kills the shell)
    const restartSessions = execSessionRegistry.getSessionsByContainer(containerId)
      .concat(execSessionRegistry.getSessionsByContainer(state.id));
    for (const s of restartSessions) {
      await execSessionRegistry.forceKillSession(s.sessionId, "container_restarted").catch((e) => {
        logger.debug("Error cleaning exec session on restart", { error: e.message });
      });
    }

    // Wait for container to reach running state
    const stateReached = await waitForContainerState(containerId, "running", 20);

    // Invalidate cache after state change
    containerCacheService.invalidateContainer(state.id);

    // Record action ONLY after state is confirmed
    await actionHistoryService.recordAction({
      containerId: state.id,
      containerName: state.name,
      action: "restart",
      status: "success",
      reason: `Restarted from ${state.state} state`,
      source: "user",
    });

    logger.info("Container restarted and confirmed", { containerId, stateReached });

    return {
      success: true,
      statusCode: 200,
      data: {
        containerId: state.id,
        action: "restart",
        previousState: state.state,
        currentState: "running",
      },
      message: "Container restarted successfully",
    };
  } catch (error) {
    logger.error("Failed to restart container", { containerId, error: error.message });

    actionHistoryService.recordAction({
      containerId: state.id,
      containerName: state.name,
      action: "restart",
      status: "failed",
      reason: error.message,
      source: "user",
    });

    return {
      success: false,
      statusCode: 500,
      data: null,
      message: `Failed to restart container: ${error.message}`,
    };
  }
}

/**
 * Remove a container
 * Container must be stopped first (unless force is used)
 */
async function removeContainer(containerId, force = false) {
  logger.info("Container remove requested", { containerId, force });

  // Check current state
  const state = await getContainerState(containerId);

  if (!state) {
    logger.warn("Container not found", { containerId });
    return {
      success: false,
      statusCode: 404,
      data: null,
      message: `Container ${containerId} not found`,
    };
  }

  // Validate state (if not forcing)
  if (!force && state.running) {
    logger.warn("Cannot remove running container", { containerId, state: state.state });
    return {
      success: false,
      statusCode: 400,
      data: { containerId: state.id, currentState: state.state },
      message: "Cannot remove a running container. Stop it first or use force=true",
    };
  }

  // Perform remove action
  try {
    const container = docker.getContainer(containerId);

    await container.remove({ force });

    logger.info("Container removed successfully", { containerId, force });

    // Clean up any active exec sessions for this container
    const removeSessions = execSessionRegistry.getSessionsByContainer(containerId)
      .concat(execSessionRegistry.getSessionsByContainer(state.id));
    for (const s of removeSessions) {
      await execSessionRegistry.forceKillSession(s.sessionId, "container_removed").catch((e) => {
        logger.debug("Error cleaning exec session on remove", { error: e.message });
      });
    }

    // Invalidate cache after removal
    containerCacheService.invalidateContainer(state.id);

    actionHistoryService.recordAction({
      containerId: state.id,
      containerName: state.name,
      action: "remove",
      status: "success",
      reason: force ? `Force removed from ${state.state} state` : `Removed from ${state.state} state`,
      source: "user",
    });

    return {
      success: true,
      statusCode: 200,
      data: {
        containerId: state.id,
        action: "remove",
        previousState: state.state,
        forced: force,
      },
      message: "Container removed successfully",
    };
  } catch (error) {
    logger.error("Failed to remove container", { containerId, error: error.message });

    actionHistoryService.recordAction({
      containerId: state.id,
      containerName: state.name,
      action: "remove",
      status: "failed",
      reason: error.message,
      source: "user",
    });

    return {
      success: false,
      statusCode: 500,
      data: null,
      message: `Failed to remove container: ${error.message}`,
    };
  }
}

/**
 * Pause a running container
 * Validates state before pausing (must be running)
 */
async function pauseContainer(containerId) {
  logger.info("Container pause requested", { containerId });

  const state = await getContainerState(containerId);

  if (!state) {
    logger.warn("Container not found", { containerId });
    return {
      success: false,
      statusCode: 404,
      data: null,
      message: `Container ${containerId} not found`,
    };
  }

  // Can only pause running containers that aren't already paused
  if (!state.running || state.paused) {
    logger.warn("Cannot pause container in current state", { containerId, state: state.state });
    return {
      success: false,
      statusCode: 400,
      data: { containerId: state.id, currentState: state.state },
      message: `Cannot pause container because it is ${state.state}. Only running containers can be paused`,
    };
  }

  try {
    const container = docker.getContainer(containerId);

    await container.pause();

    logger.info("Container pause command completed", { containerId });

    // Clean up any active exec sessions for this container (paused containers can't exec)
    const pauseSessions = execSessionRegistry.getSessionsByContainer(containerId)
      .concat(execSessionRegistry.getSessionsByContainer(state.id));
    for (const s of pauseSessions) {
      await execSessionRegistry.forceKillSession(s.sessionId, "container_paused").catch((e) => {
        logger.debug("Error cleaning exec session on pause", { error: e.message });
      });
    }

    // Wait for container to reach paused state
    const stateReached = await waitForContainerState(containerId, "paused", 20);

    containerCacheService.invalidateContainer(state.id);

    // Record action ONLY after state is confirmed
    await actionHistoryService.recordAction({
      containerId: state.id,
      containerName: state.name,
      action: "pause",
      status: "success",
      reason: `Paused from ${state.state} state`,
      source: "user",
    });

    logger.info("Container paused and confirmed", { containerId, stateReached });

    return {
      success: true,
      statusCode: 200,
      data: {
        containerId: state.id,
        action: "pause",
        previousState: state.state,
        currentState: "paused",
      },
      message: "Container paused successfully",
    };
  } catch (error) {
    logger.error("Failed to pause container", { containerId, error: error.message });

    actionHistoryService.recordAction({
      containerId: state.id,
      containerName: state.name,
      action: "pause",
      status: "failed",
      reason: error.message,
      source: "user",
    });

    return {
      success: false,
      statusCode: 500,
      data: null,
      message: `Failed to pause container: ${error.message}`,
    };
  }
}

/**
 * Unpause a paused container
 * Validates state before unpausing (must be paused)
 */
async function unpauseContainer(containerId) {
  logger.info("Container unpause requested", { containerId });

  const state = await getContainerState(containerId);

  if (!state) {
    logger.warn("Container not found", { containerId });
    return {
      success: false,
      statusCode: 404,
      data: null,
      message: `Container ${containerId} not found`,
    };
  }

  // Can only unpause paused containers
  if (!state.paused) {
    logger.warn("Cannot unpause non-paused container", { containerId, state: state.state });
    return {
      success: false,
      statusCode: 400,
      data: { containerId: state.id, currentState: state.state },
      message: `Cannot unpause container because it is ${state.state}. Only paused containers can be unpaused`,
    };
  }

  try {
    const container = docker.getContainer(containerId);

    await container.unpause();

    logger.info("Container unpause command completed", { containerId });

    // Wait for container to reach running state
    const stateReached = await waitForContainerState(containerId, "running", 20);

    containerCacheService.invalidateContainer(state.id);

    // Record action ONLY after state is confirmed
    await actionHistoryService.recordAction({
      containerId: state.id,
      containerName: state.name,
      action: "unpause",
      status: "success",
      reason: `Unpaused from ${state.state} state`,
      source: "user",
    });

    logger.info("Container unpaused and confirmed", { containerId, stateReached });

    return {
      success: true,
      statusCode: 200,
      data: {
        containerId: state.id,
        action: "unpause",
        previousState: state.state,
        currentState: "running",
      },
      message: "Container unpaused successfully",
    };
  } catch (error) {
    logger.error("Failed to unpause container", { containerId, error: error.message });

    actionHistoryService.recordAction({
      containerId: state.id,
      containerName: state.name,
      action: "unpause",
      status: "failed",
      reason: error.message,
      source: "user",
    });

    return {
      success: false,
      statusCode: 500,
      data: null,
      message: `Failed to unpause container: ${error.message}`,
    };
  }
}

/**
 * Create a new container from an image
 * Pulls image if missing, validates name uniqueness, creates and optionally starts container
 */
async function createContainer({ image, name, ports = {}, env = {}, autoStart = true, networkMode, labels, volumes, command, restartPolicy, maxRetryCount, cpuLimit, memoryLimit }) {
  logger.info("Container create requested", { image, name, autoStart });

  if (!image) {
    return {
      success: false,
      statusCode: 400,
      data: null,
      message: "Image name is required",
    };
  }

  // Sanitize container name: Docker only allows [a-zA-Z0-9][a-zA-Z0-9_.-]
  if (name) {
    name = name.replace(/[^a-zA-Z0-9_.-]/g, '-').replace(/^[^a-zA-Z0-9]+/, '');
    if (!name) name = undefined;
  }

  try {
    // Check if image exists locally, pull if missing
    try {
      await docker.getImage(image).inspect();
      logger.info("Image already exists locally", { image });
    } catch (error) {
      if (error.statusCode === 404) {
        logger.info("Image not found locally, pulling...", { image });

        // Pull image and consume stream fully (dockerode quirk)
        await new Promise((resolve, reject) => {
          docker.pull(image, (err, stream) => {
            if (err) {
              return reject(err);
            }

            // Follow progress until stream ends
            docker.modem.followProgress(stream, (err, output) => {
              if (err) {
                return reject(err);
              }
              logger.info("Image pulled successfully", { image });
              resolve(output);
            });
          });
        });
      } else {
        throw error;
      }
    }

    // Validate container name uniqueness (if provided)
    if (name) {
      const containers = await docker.listContainers({ all: true });
      const nameExists = containers.some(c =>
        c.Names.some(n => n === `/${name}` || n === name)
      );

      if (nameExists) {
        logger.warn("Container name already exists", { name });
        return {
          success: false,
          statusCode: 400,
          data: null,
          message: `Container name "${name}" already exists`,
        };
      }
    }

    // Build port bindings for dockerode
    const portBindings = {};
    const exposedPorts = {};

    for (const [containerPort, hostPort] of Object.entries(ports)) {
      const portKey = `${containerPort}/tcp`;
      exposedPorts[portKey] = {};
      portBindings[portKey] = [{ HostPort: String(hostPort) }];
    }

    // Build environment variables array
    const envArray = Object.entries(env).map(([key, value]) => `${key}=${value}`);

    // Create container configuration
    const createOptions = {
      Image: image,
      name: name || undefined,
      ExposedPorts: Object.keys(exposedPorts).length > 0 ? exposedPorts : undefined,
      Env: envArray.length > 0 ? envArray : undefined,
      HostConfig: {
        PortBindings: Object.keys(portBindings).length > 0 ? portBindings : undefined,
      },
    };

    // Apply CPU resource limit (Docker expects NanoCpus = cores * 1e9)
    if (cpuLimit && cpuLimit > 0) {
      createOptions.HostConfig.NanoCpus = Math.round(cpuLimit * 1e9);
    }

    // Apply memory resource limit (Docker expects bytes)
    if (memoryLimit && memoryLimit > 0) {
      createOptions.HostConfig.Memory = memoryLimit * 1024 * 1024;
    }

    // Compose-specific: network mode
    if (networkMode) {
      createOptions.HostConfig.NetworkMode = networkMode;
    }

    // Compose-specific: labels
    if (labels && typeof labels === 'object') {
      createOptions.Labels = labels;
    }

    // Compose-specific: restart policy
    if (restartPolicy) {
      createOptions.HostConfig.RestartPolicy = {
        Name: restartPolicy,
        MaximumRetryCount: (restartPolicy === 'on-failure' && maxRetryCount > 0) ? Number(maxRetryCount) : 0,
      };
    }

    // Compose-specific: volumes
    if (volumes && Array.isArray(volumes)) {
      createOptions.HostConfig.Binds = volumes.map(vol =>
        typeof vol === 'string' ? vol : `${vol.source}:${vol.target}`
      );
    }

    // Compose-specific: command
    if (command) {
      if (typeof command === 'string') {
        createOptions.Cmd = command.split(/\s+/);
      } else if (Array.isArray(command)) {
        createOptions.Cmd = command;
      }
    }

    // Create container
    const container = await docker.createContainer(createOptions);
    const containerInfo = await container.inspect();
    const containerId = containerInfo.Id.substring(0, 12);
    const containerName = containerInfo.Name.replace("/", "");

    logger.info("Container created successfully", { containerId, containerName });

    let finalStatus = "created";

    // Start container if autoStart is true
    if (autoStart) {
      try {
        await container.start();
        finalStatus = "running";
        logger.info("Container started successfully", { containerId });
      } catch (startError) {
        logger.warn("Container created but failed to start", {
          containerId,
          error: startError.message
        });

        // Record failed start action
        actionHistoryService.recordAction({
          containerId,
          containerName,
          action: "start",
          status: "failed",
          reason: `Auto-start failed: ${startError.message}`,
          source: "system",
        });
      }
    }

    // Invalidate containers list cache
    containerCacheService.invalidateContainerList();

    // Record create action
    actionHistoryService.recordAction({
      containerId,
      containerName,
      action: "create",
      status: "success",
      reason: `Created from image ${image}${autoStart ? " and started" : ""}`,
      source: "user",
    });

    return {
      success: true,
      statusCode: 201,
      data: {
        id: containerId,
        name: containerName,
        status: finalStatus,
      },
      message: `Container created successfully${autoStart ? " and started" : ""}`,
    };

  } catch (error) {
    logger.error("Failed to create container", { image, name, error: error.message });

    // Record failed create action (use image name as fallback)
    actionHistoryService.recordAction({
      containerId: "unknown",
      containerName: name || image,
      action: "create",
      status: "failed",
      reason: error.message,
      source: "user",
    });

    // Handle Docker name conflict error as final authority
    if (error.statusCode === 409 || error.message.includes("already in use")) {
      return {
        success: false,
        statusCode: 409,
        data: null,
        message: `Container name "${name}" is already in use`,
      };
    }

    return {
      success: false,
      statusCode: 500,
      data: null,
      message: `Failed to create container: ${error.message}`,
    };
  }
}

export {
  startContainer,
  stopContainer,
  restartContainer,
  removeContainer,
  pauseContainer,
  unpauseContainer,
  createContainer,
  getContainerState
};
