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
        if (process.env.NODE_ENV === 'production') {
            if (!process.env.DASHBOARD_BASE_URL) {
                logger.error("FATAL: DASHBOARD_BASE_URL must be defined in production.");
                process.exit(1);
            }
            if (!process.env.GATEWAY_BASE_URL) {
                logger.error("FATAL: GATEWAY_BASE_URL must be defined in production.");
                process.exit(1);
            }
        }
        
        this.dashboardBaseUrl = process.env.DASHBOARD_BASE_URL || 'http://localhost:5173';
        this.apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:5000';
        this.gatewayBaseUrl = process.env.GATEWAY_BASE_URL || 'http://localhost:8080';
        this.wildcardDomain = process.env.WILDCARD_DOMAIN || 'devopsease.local';
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
     * Generate a URL for a custom domain.
     * @param {string} hostname - The custom hostname
     * @param {string} path - Optional path
     * @returns {string}
     */
    customDomainUrl(hostname, path = '/') {
        return `https://${hostname}${path}`;
    }

    /**
     * Generate a URL to the dashboard.
     * @param {string} path - Optional path
     * @returns {string}
     */
    dashboardUrl(path = '/') {
        return `${this._getDashboardBase()}${path}`;
    }

    /**
     * Generate a URL to a specific domain's detail page in the dashboard.
     * @param {string} domainId - The domain ID
     * @returns {string}
     */
    domainDetailUrl(domainId) {
        return this.dashboardUrl(`/domains/${domainId}`);
    }

    /**
     * Generate a URL to a specific certificate's detail page in the dashboard.
     * @param {string} domainId - The domain ID
     * @returns {string}
     */
    certificateDetailUrl(domainId) {
        return this.dashboardUrl(`/domains/${domainId}#certificate`);
    }

    /**
     * @private
     */
    _getDashboardBase() {
        return this.dashboardBaseUrl;
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
