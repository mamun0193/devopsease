/**
 * Base interface for Domain Verification Providers.
 * 
 * New verification methods (e.g., DNS_TXT, HTTP, EMAIL) should implement this interface
 * and be registered with the DomainService.
 */
export default class VerificationProvider {
    /**
     * The unique identifier for this verification method.
     * @returns {string} - e.g., 'dns_txt', 'http'
     */
    get method() {
        throw new Error('Not implemented');
    }

    /**
     * Generate a challenge for the given domain.
     * @param {Object} domain - The domain document
     * @returns {Promise<{token: string, instructions: string, expiresAt: Date}>}
     */
    async generateChallenge(domain) {
        throw new Error('Not implemented');
    }

    /**
     * Verify that the challenge has been satisfied by the user.
     * @param {Object} domain - The domain document
     * @param {Object} challenge - The stored verification challenge details
     * @returns {Promise<{verified: boolean, reason: string}>}
     */
    async verify(domain, challenge) {
        throw new Error('Not implemented');
    }
}
