// Gateway barrel export
export { default as gatewayService } from './gateway.service.js';
export { default as gatewayEvents } from './gateway.events.js';
export { default as metricsCollector } from './metrics.collector.js';
export { resolve, invalidateAll, getCacheSize } from './resolver.service.js';
export { parseGatewayRequest, isValidSlug } from './router.service.js';
export { proxyHttp, proxyWs } from './proxy.service.js';
export { gatewayMiddleware, registerGatewayMiddleware, runExtensions, getRegisteredMiddleware } from './gateway.middleware.js';
export { getResolverForProvider, registerResolver, getRegisteredProviders } from './resolverRegistry.js';
export { EndpointResolver, createRuntimeEndpoint } from './endpointResolver.interface.js';
export { GatewayRequestContext, createGatewayContext } from './context.js';
