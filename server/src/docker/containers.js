const docker = require("./client");

// docker ps
async function listContainers() {
  return docker.listContainers({ all: true });
}

// docker logs
async function getContainerLogs(id) {
  const container = docker.getContainer(id);

  const logs = await container.logs({
    stdout: true,
    stderr: true,
    tail: 100,
  });

  return logs.toString();
}

module.exports = {
  listContainers,
  getContainerLogs,
};
