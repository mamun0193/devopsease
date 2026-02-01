import docker from "./client.js";

// docker ps
async function listContainers() {
  return docker.listContainers({ all: true });
}

// docker logs
async function getContainerLogs(id, options = {}) {
  const container = docker.getContainer(id);
  const { tail = 500, since, until } = options;

  const logOptions = {
    stdout: true,
    stderr: true,
    tail: tail,
    timestamps: true, // Always include Docker timestamps
  };

  // Add time filters if provided (Unix timestamps)
  if (since) {
    logOptions.since = since;
  }
  if (until) {
    logOptions.until = until;
  }

  const logs = await container.logs(logOptions);

  return logs.toString();
}

export { listContainers, getContainerLogs };
