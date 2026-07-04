import { parseGatewayRequest } from './router.service.js';
import { resolve as resolveTarget, resolveByHostname } from './resolver.service.js';
import { proxyHttp, proxyWs } from './proxy.service.js';
import { runExtensions } from './gateway.middleware.js';
import metricsCollector from './metrics.collector.js';
import logger from '../utils/logger.js';

// Gateway Service — Main orchestrator for application proxying.

// Handle an HTTP request through the gateway. 
async function handleHttpRequest(req, res) {
    const parsed = parseGatewayRequest(req);
    if (!parsed) {
        res.status(400).json({ error: 'Invalid request' });
        return;
    }

    const { hostname, slug, subPath } = parsed;
    const ctx = req.gatewayContext;
    
    // First try to resolve by custom hostname
    let result = null;
    let resolvedSlug = slug;
    
    // Skip hostname resolution if it's obviously localhost or an IP (though in prod you'd check against a list of platform domains)
    const isPlatformDomain = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === process.env.PLATFORM_DOMAIN;
    
    if (!isPlatformDomain) {
        result = await resolveByHostname(hostname);
    }

    // Fall back to slug resolution if no custom domain match
    if (!result) {
        if (!slug) {
            res.status(400).json({ error: 'Invalid application slug' });
            return;
        }
        result = await resolveTarget(slug);
    } else {
        // If resolved by hostname, we need the underlying slug for context/metrics
        resolvedSlug = result.application.slug;
    }

    // Populate context with resolved slug (might be the underlying one if matched by custom domain)
    if (ctx) ctx.setSlug(resolvedSlug, subPath);
    req._gatewaySlug = resolvedSlug;

    try {
        metricsCollector.incrementConnections(resolvedSlug);

        // Application not found
        if (!result) {
            res.status(404).json({
                error: 'Application not found',
                slug: resolvedSlug,
                message: `No application found for ${hostname}${subPath}`,
            });
            return;
        }

        const { application, deployment, runtime } = result;

        // Populate context with resolved data
        if (ctx) {
            ctx.setApplication(application);
            ctx.setDeployment(deployment);
            ctx.setRuntime(runtime);
        }

        // Run post-resolve extensions 
        await new Promise((resolve, reject) => {
            runExtensions(req, res, 'post-resolve', (err) => err ? reject(err) : resolve());
        });

        // If an extension already sent a response, bail
        if (res.headersSent) return;

        // Auth enforcement 
        if (application.visibility === 'private') {
            if (!ctx?.isAuthenticated && !req._gatewayUser) {
                res.status(401).json({
                    error: 'Authentication required',
                    message: 'This application is private. Please log in.',
                });
                return;
            }

            const userId = ctx?.userId || String(req._gatewayUser?._id);
            const ownerId = String(application.userId);
            if (userId !== ownerId) {
                res.status(403).json({
                    error: 'Access denied',
                    message: 'You do not have access to this application.',
                });
                return;
            }
        }

        //  No active deployment 
        if (!deployment || !runtime?.endpoint) {
            res.status(503).json({
                error: 'No active deployment',
                slug,
                applicationName: application.name,
                message: 'This application does not have an active deployment.',
            });
            return;
        }

        //  Unhealthy — delegate health info from runtime provider 
        if (!runtime.healthy) {
            res.status(503).json({
                error: 'Application unavailable',
                slug,
                applicationName: application.name,
                status: application.status,
                health: application.health,
                provider: runtime.provider,
                message: 'The application is not currently healthy. It may be starting, stopping, or has crashed.',
            });
            return;
        }

        // Run pre-proxy extensions 
        await new Promise((resolve, reject) => {
            runExtensions(req, res, 'pre-proxy', (err) => err ? reject(err) : resolve());
        });

        if (res.headersSent) return;

        // Proxy the request 
        if (ctx) ctx.markProxied();
        proxyHttp(req, res, runtime.endpoint, slug, subPath, ctx);

    } catch (err) {
        logger.error('Gateway service error', {
            slug: resolvedSlug,
            error: err.message,
            stack: err.stack,
            ...(ctx ? { requestId: ctx.requestId } : {}),
        });

        if (!res.headersSent) {
            res.status(502).json({
                error: 'Gateway error',
                message: 'An unexpected error occurred while routing your request.',
            });
        }
    } finally {
        // Decrement on response finish
        res.on('finish', () => metricsCollector.decrementConnections(resolvedSlug));
    }
}

// Handle a WebSocket upgrade through the gateway 
async function handleWsUpgrade(req, socket, head) {
    const hostname = req.hostname || req.headers.host?.split(':')[0];
    
    // Parse slug from URL: /apps/:slug/...
    const urlParts = req.url.replace(/^\/apps\//, '').split('/');
    const slug = urlParts[0];
    const subPath = '/' + urlParts.slice(1).join('/');

    let result = null;
    let resolvedSlug = slug;
    
    const isPlatformDomain = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === process.env.PLATFORM_DOMAIN;
    
    if (!isPlatformDomain) {
        result = await resolveByHostname(hostname);
    }
    
    if (!result) {
        if (!slug) {
            socket.destroy();
            return;
        }
        result = await resolveTarget(slug);
    } else {
        resolvedSlug = result.application.slug;
    }

    try {
        metricsCollector.incrementWsConnections();

        if (!result || !result.runtime?.endpoint || !result.runtime?.healthy) {
            socket.destroy();
            return;
        }

        // Check protocol capability
        const capabilities = result.runtime.capabilities || ['http', 'ws'];
        if (!capabilities.includes('ws')) {
            logger.warn('Gateway WS upgrade rejected: endpoint does not support WebSocket', { slug: resolvedSlug });
            socket.destroy();
            return;
        }

        proxyWs(req, socket, head, result.runtime.endpoint, resolvedSlug, subPath);

        socket.on('close', () => metricsCollector.decrementWsConnections());

    } catch (err) {
        logger.error('Gateway WS upgrade error', { slug: resolvedSlug, error: err.message });
        socket.destroy();
    }
}

// Get global gateway metrics (for dashboard).
function getGlobalMetrics() {
    return metricsCollector.getGlobalMetrics();
}

// Get per-application gateway metrics.
function getApplicationMetrics(appIdOrSlug) {
    return metricsCollector.getApplicationMetrics(appIdOrSlug);
}

export default {
    handleHttpRequest,
    handleWsUpgrade,
    getGlobalMetrics,
    getApplicationMetrics,
};
