import { randomUUID } from 'crypto';
import logger from '../utils/logger.js';
import metricsCollector from './metrics.collector.js';
import { createGatewayContext } from './context.js';

/**
 * Gateway Middleware — Extensible request pipeline for gateway-proxied requests.
 *
 * Architecture: Open for extension, closed for modification.
 * New middleware modules can be plugged in via `registerGatewayMiddleware()`
 * without modifying this file or the gateway core.
 *
 * Built-in pipeline:
 *   1. context       — Create GatewayRequestContext
 *   2. requestId     — Generate X-Request-Id and X-Correlation-Id
 *   3. tracing       — Log gateway request start
 *   4. authentication— Extract JWT if present (enforcement deferred to gateway service)
 *   5. metrics       — Wrap response to capture latency/status on finish
 *
 * Extension points (register with registerGatewayMiddleware):
 *   - rateLimiting       (future)
 *   - requestTransform   (future)
 *   - headerInjection    (future)
 *   - ipFiltering        (future)
 *   - securityPolicies   (future)
 *   - auditLogging       (future)
 *   - analytics          (future)
 */

// ── Extension Registry ───────────────────────────────────────────────────────

const _extensions = []; // Array<{ name: string, phase: string, handler: Function }>

/**
 * Register a middleware extension into the gateway pipeline.
 * Extensions run after built-in middleware but before proxying.
 *
 * @param {string} name — Identifier for logging/debugging
 * @param {string} phase — 'pre-resolve' | 'post-resolve' | 'pre-proxy'
 * @param {Function} handler — async (req, res, next) => void
 */
export function registerGatewayMiddleware(name, phase, handler) {
    _extensions.push({ name, phase, handler });
    logger.info('Gateway middleware registered', { name, phase });
}

export function getRegisteredMiddleware() {
    return _extensions.map(e => ({ name: e.name, phase: e.phase }));
}

// ── Built-in Middleware Steps ────────────────────────────────────────────────

// 1. Create GatewayRequestContext
function contextStep(req, res, next) {
    const ctx = createGatewayContext(req);
    req.gatewayContext = ctx;

    // Set response headers from context
    res.setHeader('X-Request-Id', ctx.requestId);
    res.setHeader('X-Correlation-Id', ctx.correlationId);

    // Also set on req.headers for downstream proxy forwarding
    req.headers['x-request-id'] = ctx.requestId;
    req.headers['x-correlation-id'] = ctx.correlationId;

    next();
}

// 2. Tracing — log gateway request start
function tracingStep(req, res, next) {
    const ctx = req.gatewayContext;
    if (ctx) {
        logger.debug('Gateway request started', {
            requestId: ctx.requestId,
            correlationId: ctx.correlationId,
            method: ctx.method,
            url: ctx.originalUrl,
        });
    }
    next();
}

// 3. Authentication — extract JWT if present (lazy enforcement)
function authStep(req, res, next) {
    const token = req.cookies?.access_token;
    if (token) {
        import('jsonwebtoken').then(jwt => {
            try {
                const decoded = jwt.default.verify(token, process.env.JWT_SECRET);
                const user = { ...decoded, _id: decoded.userId };
                req._gatewayUser = user;
                if (req.gatewayContext) req.gatewayContext.setAuth(user);
            } catch {
                req._gatewayUser = null;
            }
            next();
        }).catch(() => {
            req._gatewayUser = null;
            next();
        });
    } else {
        req._gatewayUser = null;
        next();
    }
}

// 4. Metrics — wrap res.end() to capture response metrics
function metricsStep(req, res, next) {
    const startTime = Date.now();
    const originalEnd = res.end;

    res.end = function (...args) {
        const latencyMs = Date.now() - startTime;
        const ctx = req.gatewayContext;
        const slug = ctx?.slug || req._gatewaySlug || 'unknown';
        const status = res.statusCode || 200;

        if (ctx) ctx.markCompleted();

        metricsCollector.record(slug, {
            status,
            latencyMs,
            bytesIn: parseInt(req.headers['content-length'] || '0', 10),
            bytesOut: parseInt(res.getHeader('content-length') || '0', 10),
            url: req.originalUrl,
        });

        logger.debug('Gateway request completed', {
            slug,
            status,
            latencyMs,
            method: req.method,
            url: req.originalUrl,
            ...(ctx ? { requestId: ctx.requestId } : {}),
        });

        return originalEnd.apply(this, args);
    };
    next();
}

// ── Combined Pipeline ────────────────────────────────────────────────────────

/**
 * Combined gateway middleware stack.
 * Runs built-in steps in order, then any registered extensions with phase 'pre-resolve'.
 */
export function gatewayMiddleware(req, res, next) {
    contextStep(req, res, () => {
        tracingStep(req, res, () => {
            metricsStep(req, res, () => {
                authStep(req, res, () => {
                    // Run pre-resolve extensions
                    runExtensions(req, res, 'pre-resolve', next);
                });
            });
        });
    });
}

/**
 * Run registered extensions for a given phase.
 * Called by gateway.service.js at appropriate lifecycle points.
 */
export function runExtensions(req, res, phase, done) {
    const phaseHandlers = _extensions.filter(e => e.phase === phase);

    if (phaseHandlers.length === 0) {
        done();
        return;
    }

    let i = 0;
    function runNext(err) {
        if (err) {
            logger.warn('Gateway middleware extension error', {
                phase,
                extension: phaseHandlers[i - 1]?.name,
                error: err.message,
            });
            // Skip failed extension, continue pipeline
        }
        if (i >= phaseHandlers.length) {
            done();
            return;
        }
        const ext = phaseHandlers[i++];
        try {
            ext.handler(req, res, runNext);
        } catch (syncErr) {
            runNext(syncErr);
        }
    }

    runNext();
}
