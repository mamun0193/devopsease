import logger from '../utils/logger.js';

/**
 * Platform URL Resolver
 * 
 * Provides a single, consistent source for generating platform URLs.
 * All subsystems (Preview, Domains, Certificates, Public API, Custom Domains)
 * should use this service instead of hardcoding URLs.
 * 
 * Extension points:
 *   - Custom domains (Day 108+)
 *   - HTTPS certificate resolution
 *   - Multi-region URL routing
 *   - Public API base URLs
 */

class UrlResolver {
    constructor() {
        this._baseUrl = null;
    }

    /**
     * Initialize with the platform's gateway base URL.
     * Called once during server startup after env validation.
     */
    init() {
        this._baseUrl = process.env.GATEWAY_BASE_URL
            || process.env.BASE_URL
            || `http://localhost:${process.env.PORT || 4000}`;

        logger.info(`[UrlResolver] Base URL: ${this._baseUrl}`);
    }

    /**
     * Generate the public URL for a preview environment.
     * @param {string} slug - The preview slug
     * @returns {string}
     */
    previewUrl(slug) {
        return `${this._getBase()}/apps/${slug}`;
    }

    /**
     * Generate the public URL for a deployed application.
     * @param {string} slug - The application slug
     * @returns {string}
     */
    applicationUrl(slug) {
        return `${this._getBase()}/apps/${slug}`;
    }

    /**
     * Generate an API endpoint URL.
     * @param {string} path - API path (e.g., '/api/previews')
     * @returns {string}
     */
    apiUrl(path) {
        return `${this._getBase()}${path}`;
    }

    /**
     * @private
     */
    _getBase() {
        if (!this._baseUrl) this.init();
        return this._baseUrl;
    }
}

export default new UrlResolver();
