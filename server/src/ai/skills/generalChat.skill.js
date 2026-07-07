import BaseSkill from './baseSkill.js';
import { generalChatTemplate } from '../templates/prompts.js';

export default class GeneralChatSkill extends BaseSkill {
    constructor() {
        super('GeneralChat');
    }

    canHandle(query) {
        return true; // Fallback for everything else
    }

    getTemplate() {
        return generalChatTemplate;
    }
}
