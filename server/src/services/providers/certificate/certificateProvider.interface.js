/**
 * Base interface for Certificate Providers.
 * 
 * New certificate providers (e.g., Let's Encrypt, ZeroSSL, custom CA) should implement
 * this interface and be registered with the CertificateService.
 */
export default class CertificateProvider {
    /**
     * The unique identifier for this provider.
     * @returns {string} - e.g., 'platform', 'letsencrypt'
     */
    get name() {
        throw new Error('Not implemented');
    }

    /**
     * Request the issuance of a new certificate.
     * @param {Object} certificate - The certificate document
     * @param {Object} domain - The primary domain requesting the cert
     * @returns {Promise<{
     *   status: string,          // 'validating' or 'issued'
     *   serialNumber?: string,
     *   fingerprint?: string,
     *   issuer?: string,
     *   issuedAt?: Date,
     *   expiresAt?: Date
     * }>}
     */
    async requestCertificate(certificate, domain) {
        throw new Error('Not implemented');
    }

    /**
     * Check the status of a pending certificate request.
     * @param {Object} certificate - The certificate document
     * @returns {Promise<{
     *   status: string,          // 'validating', 'issued', 'failed'
     *   serialNumber?: string,
     *   fingerprint?: string,
     *   issuer?: string,
     *   issuedAt?: Date,
     *   expiresAt?: Date,
     *   error?: string
     * }>}
     */
    async checkStatus(certificate) {
        throw new Error('Not implemented');
    }

    /**
     * Revoke a certificate.
     * @param {Object} certificate - The certificate document
     * @param {string} reason - Revocation reason
     * @returns {Promise<void>}
     */
    async revokeCertificate(certificate, reason) {
        throw new Error('Not implemented');
    }
}
