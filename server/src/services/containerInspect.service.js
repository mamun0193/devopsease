import docker from '../docker/client.js';
import { analyzeExitCode } from '../intelligence/signals/exitCodes.js';

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

  // Extract exit code analysis
  const exitCode = inspectData.State?.ExitCode;
  const exitAnalysis = analyzeExitCode(exitCode);

  // Extract observability data only
  return {
    name: inspectData.Name,
    image: inspectData.Config?.Image,
    state: {
      status: inspectData.State?.Status,
      exitCode: exitCode,
      exitCodeReason: exitAnalysis?.reason || null,
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
    labels: inspectData.Config?.Labels || {},
    resourceLimits: {
      memoryMB: inspectData.HostConfig?.Memory ? Math.round(inspectData.HostConfig.Memory / (1024 * 1024)) : null,
      cpuCores: inspectData.HostConfig?.NanoCpus ? inspectData.HostConfig.NanoCpus / 1e9 : null,
    },
  };
}
