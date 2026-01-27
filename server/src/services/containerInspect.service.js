import docker from '../docker/client.js';

/**
 * Inspect a container and return raw observability data
 * No intelligence or classification — pure Docker metadata
 */
export async function inspectContainer(containerId) {
  if (!containerId) {
    throw new Error('containerId is required');
  }

  const container = docker.getContainer(containerId);
  const inspectData = await container.inspect();

  // Extract observability data only
  return {
    name: inspectData.Name,
    image: inspectData.Config?.Image,
    state: {
      status: inspectData.State?.Status,
      exitCode: inspectData.State?.ExitCode,
      running: inspectData.State?.Running,
      pid: inspectData.State?.Pid,
      startedAt: inspectData.State?.StartedAt,
      finishedAt: inspectData.State?.FinishedAt
    },
    restartCount: inspectData.RestartCount,
    ports: inspectData.NetworkSettings?.Ports || {},
    environmentVariables: (inspectData.Config?.Env || []).map((env) => {
      const [key, ...valueParts] = env.split('=');
      return { key, value: valueParts.join('=') };
    }),
    mounts: (inspectData.Mounts || []).map((mount) => ({
      source: mount.Source,
      destination: mount.Destination,
      mode: mount.Mode,
      type: mount.Type
    })),
    networks: Object.entries(inspectData.NetworkSettings?.Networks || {}).map(
      ([name, config]) => ({
        name,
        ipAddress: config.IPAddress,
        gateway: config.Gateway
      })
    ),
    healthcheck: inspectData.Config?.Healthcheck || null,
    labels: inspectData.Config?.Labels || {}
  };
}
