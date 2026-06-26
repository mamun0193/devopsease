import { parseGatewayRequest } from './router.service.js';
import { resolve as resolveTarget } from './resolver.service.js';
import { proxyHttp, proxyWs } from './proxy.service.js';
import { runExtensions } from './gateway.middleware.js';
import metricsCollector from './metrics.collector.js';
import logger from '../utils/logger.js';

// Gateway Service — Main orchestrator for application proxying.

// Handle an HTTP request through the gateway. 
async function handleHttpRequest(req, res) {
    const parsed = parseGatewayRequest(req);
    if (!parsed) {
        res.status(400).json({ error: 'Invalid application slug' });
        return;
    }

    const { slug, subPath } = parsed;
    const ctx = req.gatewayContext;

    // Populate context with slug
    if (ctx) ctx.setSlug(slug, subPath);
    req._gatewaySlug = slug;

    try {
        metricsCollector.incrementConnections(slug);

        // Resolve 
        const result = await resolveTarget(slug);

        // Application not found
        if (!result) {
            res.status(404).json({
                error: 'Application not found',
                slug,
                message: `No application found at /apps/${slug}`,
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
            slug,
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
        res.on('finish', () => metricsCollector.decrementConnections(slug));
    }
}

// Handle a WebSocket upgrade through the gateway 
async function handleWsUpgrade(req, socket, head) {
    // Parse slug from URL: /apps/:slug/...
    const urlParts = req.url.replace(/^\/apps\//, '').split('/');
    const slug = urlParts[0];
    const subPath = '/' + urlParts.slice(1).join('/');

    if (!slug) {
        socket.destroy();
        return;
    }

    try {
        metricsCollector.incrementWsConnections();
        const result = await resolveTarget(slug);

        if (!result || !result.runtime?.endpoint || !result.runtime?.healthy) {
            socket.destroy();
            return;
        }

        // Check protocol capability
        const capabilities = result.runtime.capabilities || ['http', 'ws'];
        if (!capabilities.includes('ws')) {
            logger.warn('Gateway WS upgrade rejected: endpoint does not support WebSocket', { slug });
            socket.destroy();
            return;
        }

        proxyWs(req, socket, head, result.runtime.endpoint, slug, subPath);

        socket.on('close', () => metricsCollector.decrementWsConnections());

    } catch (err) {
        logger.error('Gateway WS upgrade error', { slug, error: err.message });
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
