import { DockerEndpointResolver } from './dockerEndpointResolver.js';
import logger from '../utils/logger.js';

// Resolver Registry — Maps provider names to EndpointResolver instances.
 


const _resolvers = new Map();

export function registerResolver(providerName, resolverInstance) {
    _resolvers.set(providerName, resolverInstance);
    logger.info('Registered endpoint resolver', { provider: providerName });
}

export function getResolverForProvider(providerName) {
    const resolver = _resolvers.get(providerName);
    if (!resolver) {
        throw new Error(`No endpoint resolver registered for provider: ${providerName}`);
    }
    return resolver;
}

export function getRegisteredProviders() {
    return [..._resolvers.keys()];
}

// Register built-in providers
registerResolver('docker', new DockerEndpointResolver());
