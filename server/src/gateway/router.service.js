// Router Service — Parses gateway requests to extract slug and subPath.

const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{0,62}[a-z0-9]$/;

// Parse a gateway request into { slug, subPath }.
export function parseGatewayRequest(req) {
    // req.params.slug is set by the Express route /:slug/*
    const slug = req.params.slug || req.params[0]?.split('/')[0];

    if (!slug || !SLUG_PATTERN.test(slug)) {
        return null;
    }

    // subPath is everything after /apps/:slug
    // Express wildcard param is req.params[0] for /:slug/*
    let subPath = req.params[0] || '';
    if (subPath && !subPath.startsWith('/')) {
        subPath = '/' + subPath;
    }
    if (!subPath) {
        subPath = '/';
    }

    return { slug, subPath };
}

// Validate slug format.
 
export function isValidSlug(slug) {
    return typeof slug === 'string' && SLUG_PATTERN.test(slug);
}
