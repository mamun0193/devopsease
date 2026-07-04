// Router Service — Parses gateway requests to extract slug and subPath.

const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{0,62}[a-z0-9]$/;

// Parse a gateway request into { hostname, slug, subPath }.
export function parseGatewayRequest(req) {
    const hostname = req.hostname;
    
    // req.params.slug is set by the Express route /:slug/*
    const slug = req.params.slug || req.params[0]?.split('/')[0];

    // subPath is everything after /apps/:slug
    let subPath = req.params[0] || '';
    if (subPath && !subPath.startsWith('/')) {
        subPath = '/' + subPath;
    }
    if (!subPath) {
        subPath = '/';
    }

    // If slug is invalid, it could be a custom domain request where the slug position is actually just the start of the path
    if (!slug || !SLUG_PATTERN.test(slug)) {
        return { hostname, slug: null, subPath: req.originalUrl };
    }

    return { hostname, slug, subPath };
}

// Validate slug format.
 
export function isValidSlug(slug) {
    return typeof slug === 'string' && SLUG_PATTERN.test(slug);
}
