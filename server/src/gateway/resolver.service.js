import Application from '../models/application.model.js';
import Deployment from '../models/deployment.model.js';
import RoutingTable from '../models/routingTable.model.js';
import { getResolverForProvider } from './resolverRegistry.js';
import gatewayEvents from './gateway.events.js';
import releaseEvents from '../events/release.events.js';
import logger from '../utils/logger.js';

/**
 * Resolver Service — Resolves slugs to proxy targets with full runtime metadata.
 *
 * Chain: slug → RoutingTable → Deployment → EndpointResolver.resolve(deployment) → RuntimeEndpoint
 *
 * Returns a ResolvedRoute containing everything the gateway needs:
 *   { application, deployment, runtime: RuntimeEndpoint }
 *
 * Cache: In-memory Map with event-driven invalidation + 30s TTL safety net.
 */



const CACHE_TTL_MS = 30_000;
const _cache = new Map(); // Map<slug, ResolvedRoute>

//  Event-driven invalidation 

function invalidateBySlug(slug) {
    if (_cache.delete(slug)) {
        logger.debug('Gateway resolver cache invalidated', { slug });
    }
}

function invalidateByApplicationId(applicationId) {
    const appIdStr = String(applicationId);
    for (const [slug, entry] of _cache) {
        if (String(entry.application?._id) === appIdStr) {
            _cache.delete(slug);
            logger.debug('Gateway resolver cache invalidated by applicationId', { slug, applicationId: appIdStr });
            return;
        }
    }
}

function invalidateByRepoId(repoId) {
    const repoIdStr = String(repoId);
    for (const [slug, entry] of _cache) {
        if (String(entry.application?.repositoryId) === repoIdStr ||
            String(entry.application?.repositoryId?._id) === repoIdStr) {
            _cache.delete(slug);
            logger.debug('Gateway resolver cache invalidated by repoId', { slug, repoId: repoIdStr });
        }
    }
}

export function invalidateAll() {
    const size = _cache.size;
    _cache.clear();
    if (size > 0) {
        logger.info('Gateway resolver cache flushed', { entriesCleared: size });
    }
}

// Wire up event listeners
gatewayEvents.on('deployment:finished', ({ repoId }) => {
    if (repoId) invalidateByRepoId(repoId);
});

gatewayEvents.on('deployment:rollback', ({ repoId }) => {
    if (repoId) invalidateByRepoId(repoId);
});

gatewayEvents.on('application:updated', ({ applicationId, slug }) => {
    if (slug) invalidateBySlug(slug);
    else if (applicationId) invalidateByApplicationId(applicationId);
});

gatewayEvents.on('application:deleted', ({ applicationId, slug }) => {
    if (slug) invalidateBySlug(slug);
    else if (applicationId) invalidateByApplicationId(applicationId);
});

// Listen to release orchestration events for fast cache invalidation
releaseEvents.on('ROUTING_TABLE_UPDATED', ({ slug }) => {
    if (slug) invalidateBySlug(slug);
});

// Resolution 

// Resolve a slug to a ResolvedRoute with full runtime metadata.

export async function resolve(slug) {
    // 1. Check cache
    const cached = _cache.get(slug);
    if (cached && (Date.now() - cached.cachedAt) < CACHE_TTL_MS) {
        return cached;
    }

    // 2. DB lookup: RoutingTable
    const routingTable = await RoutingTable.findOne({ slug }).sort({ version: -1 }).lean();

    if (!routingTable || !routingTable.routes || routingTable.routes.length === 0) {
        // Fallback: try to fetch Application directly if there is no routing table
        // to return a valid 'application' object for the gateway to construct proper errors.
        const application = await Application.findOne({ slug }).populate('repositoryId', 'repoName owner provider').lean();
        
        if (!application) return null;

        const entry = {
            application,
            deployment: null,
            runtime: {
                endpoint: null,
                provider: application.provider || 'docker',
                protocol: 'http',
                healthy: false,
                version: null,
                capabilities: [],
                metadata: { reason: 'No routing table or routes available for this application' },
            },
            cachedAt: Date.now(),
        };
        _cache.set(slug, entry);
        return entry;
    }

    // 3. Route selection based on weights
    let selectedRoute = null;
    const totalWeight = routingTable.routes.reduce((sum, r) => sum + r.weight, 0);

    if (totalWeight > 0) {
        let random = Math.random() * totalWeight;
        for (const route of routingTable.routes) {
            random -= route.weight;
            if (random <= 0) {
                selectedRoute = route;
                break;
            }
        }
    } else {
        selectedRoute = routingTable.routes[0];
    }

    if (!selectedRoute) {
        return null;
    }

    // 4. DB lookup: Application and Deployment
    const [application, deployment] = await Promise.all([
        Application.findById(routingTable.applicationId).populate('repositoryId', 'repoName owner provider').lean(),
        Deployment.findById(selectedRoute.deploymentId).lean()
    ]);

    if (!application || !deployment) {
        return null;
    }

    // 5. Provider-agnostic endpoint resolution → RuntimeEndpoint
    let runtime;
    try {
        const resolver = getResolverForProvider(application.provider || 'docker');
        runtime = await resolver.resolve(deployment);
        // Enrich with IDs for downstream consumers
        runtime.deploymentId = String(deployment._id);
        runtime.applicationId = String(application._id);
    } catch (err) {
        logger.warn('Gateway resolver: endpoint resolution failed', {
            slug,
            provider: application.provider,
            error: err.message,
        });
        runtime = {
            endpoint: null,
            provider: application.provider || 'docker',
            protocol: 'http',
            healthy: false,
            version: null,
            capabilities: [],
            metadata: { error: err.message },
            deploymentId: String(deployment._id),
            applicationId: String(application._id),
        };
    }

    // 6. Cache result
    const entry = { application, deployment, runtime, cachedAt: Date.now() };
    _cache.set(slug, entry);

    return entry;
}

// ── Backward compatibility ──────────────────────────────────────────────────
// These getters allow existing code that reads `result.target` and `result.healthy`
// to continue working without changes.

export function getCacheSize() {
    return _cache.size;
}
