import docker from "./client.js";
import logger from "../utils/logger.js";

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
  if (state.running) {
    logger.warn("Container already running", { containerId, state: state.state });
    return {
      success: false,
      statusCode: 400,
      data: { containerId: state.id, currentState: state.state },
      message: "Cannot start container because it is already running",
    };
  }

  if (state.paused) {
    logger.warn("Container is paused", { containerId });
    return {
      success: false,
      statusCode: 400,
      data: { containerId: state.id, currentState: "paused" },
      message: "Cannot start a paused container. Use unpause instead",
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
    
    logger.info("Container started successfully", { containerId });
    
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
    
    logger.info("Container stopped successfully", { containerId });
    
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
    
    logger.info("Container restarted successfully", { containerId });
    
    return {
      success: true,
      statusCode: 200,
      data: {
        containerId: state.id,
        action: "restart",
        previousState: state.state,
        currentState: "restarting",
      },
      message: "Container restart initiated successfully",
    };
  } catch (error) {
    logger.error("Failed to restart container", { containerId, error: error.message });
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
    return {
      success: false,
      statusCode: 500,
      data: null,
      message: `Failed to remove container: ${error.message}`,
    };
  }
}

export { startContainer, stopContainer, restartContainer, removeContainer, getContainerState };
