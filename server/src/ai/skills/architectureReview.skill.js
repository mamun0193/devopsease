import BaseSkill from './baseSkill.js';
import { architectureReviewTemplate } from '../templates/prompts.js';

export default class ArchitectureReviewSkill extends BaseSkill {
    constructor() {
        super('ArchitectureReview');
    }

    canHandle(query) {
        const lower = query.toLowerCase();
        return lower.includes('architecture') || 
               lower.includes('review') || 
               lower.includes('improve') || 
               lower.includes('bottleneck');
    }

    getTemplate() {
        return architectureReviewTemplate;
    }
}
