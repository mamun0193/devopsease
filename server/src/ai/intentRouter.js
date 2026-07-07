import FailureAnalysisSkill from './skills/failureAnalysis.skill.js';
import ArchitectureReviewSkill from './skills/architectureReview.skill.js';
import GeneralChatSkill from './skills/generalChat.skill.js';

class IntentRouter {
    constructor() {
        this.skills = [
            new FailureAnalysisSkill(),
            new ArchitectureReviewSkill(),
            new GeneralChatSkill() // Fallback must be last
        ];
    }

    /**
     * Determines the best skill based on the user's intent.
     * @param {string} userQuery
     * @returns {Object} The matched skill instance
     */
    route(userQuery) {
        for (const skill of this.skills) {
            if (skill.canHandle(userQuery)) {
                return skill;
            }
        }
        return this.skills[this.skills.length - 1]; // Fallback to general chat
    }
}

export default new IntentRouter();
