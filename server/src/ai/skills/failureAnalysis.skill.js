import BaseSkill from './baseSkill.js';
import { failureAnalysisTemplate } from '../templates/prompts.js';

export default class FailureAnalysisSkill extends BaseSkill {
    constructor() {
        super('FailureAnalysis');
    }

    canHandle(query) {
        const lower = query.toLowerCase();
        return lower.includes('fail') || 
               lower.includes('error') || 
               lower.includes('crash') || 
               lower.includes('why did it stop');
    }

    getTemplate() {
        return failureAnalysisTemplate;
    }
}
