import Application from '../models/application.model.js';
import Deployment from '../models/deployment.model.js';
import { getResolverForProvider } from './resolverRegistry.js';
import gatewayEvents from './gateway.events.js';
import logger from '../utils/logger.js';

/**
 * Resolver Service — Resolves slugs to proxy targets with full runtime metadata.
 *
 * Chain: slug → Application → currentDeploymentId → Deployment
 *        → EndpointResolver.resolve(deployment) → RuntimeEndpoint
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

// Resolution 

// Resolve a slug to a ResolvedRoute with full runtime metadata.

export async function resolve(slug) {
    // 1. Check cache
    const cached = _cache.get(slug);
    if (cached && (Date.now() - cached.cachedAt) < CACHE_TTL_MS) {
        return cached;
    }

    // 2. DB lookup: Application
    const application = await Application.findOne({ slug })
        .populate('repositoryId', 'repoName owner provider')
        .lean();

    if (!application) {
        return null;
    }

    if (!application.currentDeploymentId) {
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
                metadata: { reason: 'no current deployment' },
            },
            cachedAt: Date.now(),
        };
        _cache.set(slug, entry);
        return entry;
    }

    // 3. DB lookup: Deployment
    const deployment = await Deployment.findById(application.currentDeploymentId).lean();
    if (!deployment) {
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
                metadata: { reason: 'deployment not found' },
            },
            cachedAt: Date.now(),
        };
        _cache.set(slug, entry);
        return entry;
    }

    // 4. Provider-agnostic endpoint resolution → RuntimeEndpoint
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

    // 5. Cache result
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
