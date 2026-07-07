class PromptOrchestrator {
    /**
     * Assembles the final prompt by combining the base template, context objects, and the user's intent.
     * @param {Object} skill - The AI skill instance
     * @param {Array<Object>} knowledgeObjects - Resolved knowledge objects
     * @param {string} userQuery - The actual query from the user
     * @returns {string} The final compiled system prompt
     */
    assemblePrompt(skill, knowledgeObjects, userQuery) {
        let prompt = skill.getTemplate();

        // Inject Knowledge Objects
        const contextString = JSON.stringify(knowledgeObjects, null, 2);
        prompt = prompt.replace('{{KNOWLEDGE_CONTEXT}}', contextString);

        // Define expected output format
        const outputFormat = JSON.stringify(skill.getExpectedOutputFormat(), null, 2);
        prompt = prompt.replace('{{EXPECTED_OUTPUT}}', outputFormat);

        // Inject general AI platform constraints
        const constraints = `
CRITICAL RULES:
1. You are the AI DevOps Copilot for DevOpsEase. You are an expert Principal Engineer.
2. Never expose your internal chain of thought. Output ONLY the JSON format specified below.
3. Your output must strictly be valid JSON. No markdown backticks wrapping the JSON (e.g., \`\`\`json).
4. Only rely on the provided KNOWLEDGE_CONTEXT. Do not hallucinate resources.
`;
        return `${constraints}\n\n${prompt}`;
    }

    validateResponse(skill, rawResponse) {
        try {
            // Clean up if model incorrectly adds markdown JSON wrapping
            let cleaned = rawResponse.trim();
            if (cleaned.startsWith('```json')) {
                cleaned = cleaned.substring(7);
                if (cleaned.endsWith('```')) {
                    cleaned = cleaned.substring(0, cleaned.length - 3);
                }
            } else if (cleaned.startsWith('```')) {
                cleaned = cleaned.substring(3);
                if (cleaned.endsWith('```')) {
                    cleaned = cleaned.substring(0, cleaned.length - 3);
                }
            }
            
            const parsed = JSON.parse(cleaned);
            // We could add JSON Schema validation here based on skill.getExpectedOutputFormat()
            return parsed;
        } catch (e) {
            throw new Error(`Failed to parse AI output into valid JSON. Raw: ${rawResponse}`);
        }
    }
}

export default new PromptOrchestrator();
