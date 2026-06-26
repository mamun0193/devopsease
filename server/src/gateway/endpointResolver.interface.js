// EndpointResolver — Abstract interface for runtime endpoint resolution.

/**
 * @typedef {Object} RuntimeEndpoint
 * @property {string}        endpoint      — Full URL, e.g. 'http://127.0.0.1:4012'
 * @property {string}        provider      — Provider name, e.g. 'docker'
 * @property {string}        protocol      — Primary protocol: 'http' | 'https' | 'h2' | 'grpc'
 * @property {boolean}       healthy       — Whether the runtime reports the deployment as healthy
 * @property {string|null}   version       — Deployment version tag (e.g. image tag, commit hash)
 * @property {string[]}      capabilities  — Supported protocols: ['http', 'ws'], ['http', 'ws', 'grpc']
 * @property {Object}        metadata      — Provider-specific metadata (containerId, namespace, etc.)
 */

export class EndpointResolver {
    // Resolve a deployment to a RuntimeEndpoint descriptor. 
    async resolve(deployment) {
        throw new Error("Method 'resolve()' must be implemented by provider.");
    }

    // Check if a deployment is healthy at the runtime level.

    async isHealthy(deployment) {
        throw new Error("Method 'isHealthy()' must be implemented by provider.");
    }

    // Get provider name identifier. 
    get providerName() {
        throw new Error("Getter 'providerName' must be implemented by provider.");
    }

    // Get supported protocol capabilities for this provider.  
    get supportedProtocols() {
        return ['http', 'ws'];
    }
}

// Helper to construct a RuntimeEndpoint object with defaults.

export function createRuntimeEndpoint({
    endpoint,
    provider,
    protocol = 'http',
    healthy = false,
    version = null,
    capabilities = ['http', 'ws'],
    metadata = {},
}) {
    return {
        endpoint,
        provider,
        protocol,
        healthy,
        version,
        capabilities,
        metadata,
    };
}
