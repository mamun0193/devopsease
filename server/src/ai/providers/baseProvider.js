export default class BaseProvider {
    /**
     * @param {Array<{role: string, content: string}>} messages
     * @param {Object} options
     * @returns {Promise<string>}
     */
    async generate(messages, options = {}) {
        throw new Error('generate() must be implemented by the provider');
    }

    /**
     * @param {Array<{role: string, content: string}>} messages
     * @param {Object} options
     * @returns {AsyncGenerator<string, void, unknown>}
     */
    async *stream(messages, options = {}) {
        throw new Error('stream() must be implemented by the provider');
    }

    /**
     * @param {string} text
     * @returns {Promise<number>}
     */
    async countTokens(text) {
        throw new Error('countTokens() must be implemented by the provider');
    }

    supportsStreaming() {
        return false;
    }

    supportsVision() {
        return false;
    }

    supportsToolCalling() {
        return false;
    }

    supportsEmbeddings() {
        return false;
    }
}
