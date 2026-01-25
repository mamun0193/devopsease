import Docker from "dockerode";

const docker = new Docker({
  socketPath: "//./pipe/docker_engine" // Windows-safe
});

export default docker;
