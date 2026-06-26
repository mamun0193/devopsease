import { EndpointResolver, createRuntimeEndpoint } from './endpointResolver.interface.js';
import { getContainerState } from '../docker/deployment.js';
import logger from '../utils/logger.js';

/**
 * DockerEndpointResolver — Resolves Docker deployments to runtime endpoints.
 *
 * Resolution:  deployment.port → http://127.0.0.1:{port}
 * Health:      Checks at least one container in containerIds is 'running'
 * Protocols:   HTTP + WebSocket (Docker containers expose both over the same port)
 */
export class DockerEndpointResolver extends EndpointResolver {
    get providerName() {
        return 'docker';
    }

    get supportedProtocols() {
        return ['http', 'ws'];
    }

    async resolve(deployment) {
        if (!deployment?.port) {
            return createRuntimeEndpoint({
                endpoint: null,
                provider: 'docker',
                healthy: false,
                metadata: { reason: 'no port allocated' },
            });
        }

        const healthy = await this.isHealthy(deployment);
        const endpoint = `http://127.0.0.1:${deployment.port}`;

        const containerIds = deployment.containerIds?.length
            ? deployment.containerIds
            : (deployment.containerId ? [deployment.containerId] : []);

        return createRuntimeEndpoint({
            endpoint,
            provider: 'docker',
            protocol: 'http',
            healthy,
            version: deployment.imageTag || null,
            capabilities: ['http', 'ws'],
            metadata: {
                containerId: deployment.containerId || containerIds[0] || null,
                containerName: deployment.containerName || null,
                containerIds,
                port: deployment.port,
                replicaCount: containerIds.length,
            },
        });
    }

    async isHealthy(deployment) {
        const containerIds = deployment.containerIds?.length
            ? deployment.containerIds
            : (deployment.containerId ? [deployment.containerId] : []);

        if (containerIds.length === 0) {
            return false;
        }

        // At least one container must be running
        for (const cId of containerIds) {
            try {
                const state = await getContainerState(cId);
                if (state === 'running') {
                    return true;
                }
            } catch (err) {
                logger.debug('DockerEndpointResolver: failed to check container state', {
                    containerId: cId,
                    error: err.message,
                });
            }
        }

        return false;
    }
}

export default new DockerEndpointResolver();
