import cacheService from "../redis/cacheService.js";
import { listContainers } from "../docker/containers.js";
import docker from "../docker/client.js";
import { analyzeExitCode } from "../intelligence/signals/exitCodes.js";
import logger from "../utils/logger.js";

// Cache TTL constants (in seconds)
const TTL = {
    CONTAINER_LIST: 15, // Container list - medium frequency
    CONTAINER_STATE: 15, // Status, health, restart count - medium frequency
    CONTAINER_CONFIG: 45, // Image, ports, created, labels - low frequency
};

// Container cache service with tiered caching: state (15s TTL), config (45s TTL)
class ContainerCacheService {
    // Get all containers with caching
    async getContainers() {
        return cacheService.getOrFetch(
            "containers:list",
            () => listContainers(),
            TTL.CONTAINER_LIST
        );
    }

    // Lightweight summary for the containers list endpoint (single Docker inspect, 15s cache)
    async getContainerSummary(containerId) {
        if (!containerId) {
            throw new Error("containerId is required");
        }

        return cacheService.getOrFetch(
            `container:${containerId}:summary`,
            async () => {
                const container = docker.getContainer(containerId);
                const inspectData = await container.inspect();
                const exitCode = inspectData.State?.ExitCode;
                const exitAnalysis = analyzeExitCode(exitCode);

                // Port logic: NetworkSettings.Ports (running) -> HostConfig.PortBindings (created/stopped)
                const networkPorts = inspectData.NetworkSettings?.Ports;
                const hostPorts = inspectData.HostConfig?.PortBindings;
                const rawPorts = (networkPorts && Object.keys(networkPorts).length > 0) ? networkPorts : hostPorts;

                return {
                    name: (inspectData.Name || '').replace(/^\//, ''),
                    image: inspectData.Config?.Image,
                    created: inspectData.Created, // Add real creation time
                    state: {
                        status: inspectData.State?.Status,
                        exitCode,
                        exitCodeReason: exitAnalysis?.reason || null,
                        running: inspectData.State?.Running,
                        paused: inspectData.State?.Paused,
                        startedAt: inspectData.State?.StartedAt,
                        finishedAt: inspectData.State?.FinishedAt,
                    },
                    ports: Object.entries(rawPorts || {}).flatMap(([key, bindings]) => {
                        if (!bindings) return [];
                        const [privatePort, type] = key.split('/');
                        return bindings.map(binding => ({
                            PrivatePort: parseInt(privatePort, 10),
                            PublicPort: parseInt(binding.HostPort, 10),
                            Type: type,
                            IP: binding.HostIp
                        }));
                    }),
                };
            },
            TTL.CONTAINER_STATE
        );
    }

    // Get container inspection data with tiered caching (state & config cached separately)
    async getContainerInspect(containerId) {
        if (!containerId) {
            throw new Error("containerId is required");
        }

        // Fetch state and config in parallel with different TTLs
        const [state, config] = await Promise.all([
            cacheService.getOrFetch(
                `container:${containerId}:state`,
                () => this.fetchContainerState(containerId),
                TTL.CONTAINER_STATE
            ),
            cacheService.getOrFetch(
                `container:${containerId}:config`,
                () => this.fetchContainerConfig(containerId),
                TTL.CONTAINER_CONFIG
            ),
        ]);

        // Merge state and config into single response
        return {
            ...config,
            state: state.state,
            restartCount: state.restartCount,
        };
    }

    // Fetch container state data (medium-freq): status, running, pid, exitCode, startedAt, finishedAt, restartCount
    async fetchContainerState(containerId) {
        const container = docker.getContainer(containerId);
        const inspectData = await container.inspect();

        // Extract exit code analysis
        const exitCode = inspectData.State?.ExitCode;
        const exitAnalysis = analyzeExitCode(exitCode);

        return {
            state: {
                status: inspectData.State?.Status,
                exitCode: exitCode,
                exitCodeReason: exitAnalysis?.reason || null,
                running: inspectData.State?.Running,
                paused: inspectData.State?.Paused,
                restarting: inspectData.State?.Restarting,
                oomKilled: inspectData.State?.OOMKilled,
                dead: inspectData.State?.Dead,
                pid: inspectData.State?.Pid,
                error: inspectData.State?.Error,
                startedAt: inspectData.State?.StartedAt,
                finishedAt: inspectData.State?.FinishedAt,
            },
            restartCount: inspectData.RestartCount,
        };
    }

    // Fetch container config data (low-freq): name, image, ports, env, mounts, networks, healthcheck, labels
    async fetchContainerConfig(containerId) {
        const container = docker.getContainer(containerId);
        const inspectData = await container.inspect();

        return {
            name: inspectData.Name,
            image: inspectData.Config?.Image,
            ports: inspectData.NetworkSettings?.Ports || {},
            environmentVariables: (inspectData.Config?.Env || []).map((env) => {
                const [key, ...valueParts] = env.split("=");
                return { key, value: valueParts.join("=") };
            }),
            mounts: (inspectData.Mounts || []).map((mount) => ({
                source: mount.Source,
                destination: mount.Destination,
                mode: mount.Mode,
                type: mount.Type,
                rw: mount.RW,
            })),
            networks: Object.entries(
                inspectData.NetworkSettings?.Networks || {}
            ).map(([name, config]) => ({
                name,
                ipAddress: config.IPAddress,
                gateway: config.Gateway,
            })),
            healthcheck: inspectData.Config?.Healthcheck || null,
            labels: inspectData.Config?.Labels || {},
            restartPolicy: {
                name: inspectData.HostConfig?.RestartPolicy?.Name || 'no',
                maximumRetryCount: inspectData.HostConfig?.RestartPolicy?.MaximumRetryCount || 0,
                restartLimit: parseInt(inspectData.Config?.Labels?.['devopsease.restartLimit'], 10) || 0,
            },
        };
    }

    // Invalidate all cache entries for a container (start, stop, restart, remove) - Non-blocking, never throws
    invalidateContainer(containerId) {
        try {
            logger.info("Invalidating container cache", { containerId });
            // Fire and forget - don't await, don't block
            cacheService.invalidate(`container:${containerId}:*`);
            cacheService.del("containers:list");
        } catch (error) {
            // Never let cache errors bubble up
            logger.warn("Cache invalidation error (ignored)", {
                containerId,
                error: error.message,
            });
        }
    }

    // Invalidate only the container list cache - Non-blocking, never throws
    invalidateContainerList() {
        try {
            cacheService.del("containers:list");
        } catch (error) {
            logger.warn("Cache invalidation error (ignored)", {
                error: error.message,
            });
        }
    }
}

// Singleton instance
const containerCacheService = new ContainerCacheService();

export default containerCacheService;
