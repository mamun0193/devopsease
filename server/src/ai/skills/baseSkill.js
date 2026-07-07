export default class BaseSkill {
    constructor(name) {
        this.name = name;
    }

    /**
     * Identifies if this skill can handle the given intent/query
     * @param {string} query 
     * @returns {boolean}
     */
    canHandle(query) {
        return false;
    }

    /**
     * Returns the raw prompt template for this skill
     * @returns {string}
     */
    getTemplate() {
        throw new Error('getTemplate() not implemented');
    }

    /**
     * Returns the exact JSON schema expected from the model
     * @returns {Object}
     */
    getExpectedOutputFormat() {
        return {
            content: "string (markdown allowed)",
            explainability: {
                confidence: "number (0-100)",
                knowledgeObjectsUsed: ["string (keys of knowledge objects used)"],
                affectedResources: ["string (e.g. 'Deployment-123')"]
            }
        };
    }
}
