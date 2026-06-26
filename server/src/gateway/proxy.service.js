import httpProxy from 'http-proxy';
import logger from '../utils/logger.js';

/**
 * Proxy Service — HTTP and WebSocket proxy using http-proxy.
 
 * Extension point: SPA History API fallback
 *   Future implementation:
 *     proxy.on('proxyRes', (proxyRes, req, res) => {
 *         if (proxyRes.statusCode === 404 && isSpaApp && !hasFileExtension(req.url)) {
 *             // Retry against /index.html
 *         }
 *     });
 */

const proxy = httpProxy.createProxyServer({
    ws: true,
    xfwd: true,
    changeOrigin: true,
    proxyTimeout: 30_000,
    timeout: 30_000,
});

// Error handler — returns a styled status page instead of crashing
proxy.on('error', (err, req, res) => {
    const ctx = req.gatewayContext;
    logger.warn('Gateway proxy error', {
        target: req._gatewayTarget,
        slug: req._gatewaySlug,
        error: err.message,
        ...(ctx ? { requestId: ctx.requestId } : {}),
    });

    // res might be a Socket for WS upgrades
    if (res.writeHead) {
        const statusCode = err.code === 'ECONNREFUSED' ? 503 : 502;
        res.writeHead(statusCode, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(buildErrorPage(statusCode, req._gatewaySlug, err.message));
    } else if (res.destroy) {
        res.destroy();
    }
});

// Proxy an HTTP request to the target.

export function proxyHttp(req, res, target, slug, subPath, ctx) {
    // Attach metadata for error handler
    req._gatewayTarget = target;
    req._gatewaySlug = slug;

    // Rewrite the URL to strip /apps/:slug
    req.url = subPath || '/';

    // Inject gateway context headers into the proxied request
    if (ctx) {
        const headers = ctx.toProxyHeaders();
        for (const [key, value] of Object.entries(headers)) {
            req.headers[key.toLowerCase()] = value;
        }
    }

    proxy.web(req, res, { target });
}

//Proxy a WebSocket upgrade request to the target.

export function proxyWs(req, socket, head, target, slug, subPath) {
    req._gatewayTarget = target;
    req._gatewaySlug = slug;
    req.url = subPath || '/';

    proxy.ws(req, socket, head, { target });
}

// Build a friendly HTML error page for gateway failures.
 
function buildErrorPage(statusCode, slug, errorMessage) {
    const title = statusCode === 503 ? 'Application Unavailable' : 'Gateway Error';
    const description = statusCode === 503
        ? 'The application is not currently running or is starting up.'
        : 'An error occurred while connecting to the application.';

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} — DevOpsEase</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            background: #0a0a1a;
            color: #e2e8f0;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 2rem;
        }
        .card {
            max-width: 480px;
            width: 100%;
            background: rgba(30, 30, 50, 0.8);
            border: 1px solid rgba(139, 92, 246, 0.2);
            border-radius: 16px;
            padding: 2.5rem;
            text-align: center;
            backdrop-filter: blur(12px);
        }
        .status-code {
            font-size: 4rem;
            font-weight: 800;
            background: linear-gradient(135deg, #8b5cf6, #6366f1);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            line-height: 1;
            margin-bottom: 0.5rem;
        }
        h1 { font-size: 1.25rem; font-weight: 600; margin-bottom: 0.75rem; }
        p { color: #94a3b8; font-size: 0.875rem; line-height: 1.6; margin-bottom: 1.5rem; }
        .slug {
            display: inline-block;
            background: rgba(139, 92, 246, 0.15);
            border: 1px solid rgba(139, 92, 246, 0.3);
            padding: 0.25rem 0.75rem;
            border-radius: 6px;
            font-family: monospace;
            font-size: 0.8rem;
            color: #a78bfa;
            margin-bottom: 1.5rem;
        }
        .retry-btn {
            display: inline-block;
            background: linear-gradient(135deg, #8b5cf6, #6366f1);
            color: white;
            padding: 0.625rem 1.5rem;
            border-radius: 8px;
            text-decoration: none;
            font-size: 0.875rem;
            font-weight: 500;
            transition: opacity 0.2s;
        }
        .retry-btn:hover { opacity: 0.9; }
        .branding {
            margin-top: 2rem;
            font-size: 0.7rem;
            color: #475569;
        }
    </style>
</head>
<body>
    <div class="card">
        <div class="status-code">${statusCode}</div>
        <h1>${title}</h1>
        <p>${description}</p>
        <div class="slug">/apps/${slug || '...'}</div>
        <br>
        <a href="javascript:location.reload()" class="retry-btn">Try Again</a>
        <div class="branding">Powered by DevOpsEase Gateway</div>
    </div>
</body>
</html>`;
}

export default { proxyHttp, proxyWs };
