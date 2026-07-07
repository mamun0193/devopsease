import CopilotConversation from '../models/copilotConversation.model.js';
import CopilotMessage from '../models/copilotMessage.model.js';
import CopilotContext from '../models/copilotContext.model.js';
import CopilotRecommendation from '../models/copilotRecommendation.model.js';
import intentRouter from './intentRouter.js';
import knowledgeEngine from './knowledgeEngine.js';
import promptOrchestrator from './promptOrchestrator.js';
import GeminiProvider from './providers/geminiProvider.js';

class CopilotService {
    constructor() {
        this.provider = new GeminiProvider();
    }

    async createConversation(userId, title = 'New Conversation') {
        const conversation = await CopilotConversation.create({
            userId,
            title
        });
        return conversation;
    }

    async getConversation(id, userId) {
        return CopilotConversation.findOne({ _id: id, userId });
    }

    async getMessages(conversationId) {
        return CopilotMessage.find({ conversationId }).sort({ createdAt: 1 });
    }

    async addContext(conversationId, knowledgeType, resourceId = null) {
        return CopilotContext.findOneAndUpdate(
            { conversationId, knowledgeType, resourceId },
            { conversationId, knowledgeType, resourceId, addedAt: new Date() },
            { upsert: true, new: true }
        );
    }

    async getActiveContextObjects(conversationId) {
        const contexts = await CopilotContext.find({ conversationId });
        return knowledgeEngine.resolveContextItems(contexts);
    }

    /**
     * Handle user message and stream SSE back to client
     */
    async handleMessageStream(conversationId, userId, userMessage, res) {
        // 1. Verify and setup SSE
        const conversation = await this.getConversation(conversationId, userId);
        if (!conversation) {
            res.status(404).json({ error: 'Conversation not found' });
            return;
        }

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        // 2. Log user message
        await CopilotMessage.create({
            conversationId,
            role: 'user',
            content: userMessage
        });

        // 3. Routing & Context Assembly
        const skill = intentRouter.route(userMessage);
        const knowledgeObjects = await this.getActiveContextObjects(conversationId);
        
        // 4. Prompt Assembly
        const systemPrompt = promptOrchestrator.assemblePrompt(skill, knowledgeObjects, userMessage);
        
        // 5. Gather previous messages for LLM history (limit to last 10 for context window)
        const previousMessages = await this.getMessages(conversationId);
        const llmMessages = [
            { role: 'system', content: systemPrompt },
            ...previousMessages.slice(-10).map(m => ({ role: m.role, content: m.content }))
        ];

        // 6. Generate via Provider (Streaming)
        let fullResponseText = '';
        try {
            const stream = await this.provider.stream(llmMessages);
            
            for await (const chunk of stream) {
                fullResponseText += chunk;
                // Send SSE chunk
                res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
            }
        } catch (error) {
            console.error('LLM Streaming Error:', error);
            res.write(`data: ${JSON.stringify({ error: 'Failed to generate response' })}\n\n`);
            res.end();
            return;
        }

        // 7. Parse, Validate & Log response
        let finalOutput = null;
        try {
            finalOutput = promptOrchestrator.validateResponse(skill, fullResponseText);
        } catch (parseError) {
            // Fallback if not valid JSON
            finalOutput = {
                content: fullResponseText,
                explainability: {
                    confidence: 50,
                    knowledgeObjectsUsed: knowledgeObjects.map(k => k.type),
                    affectedResources: [],
                    skillInvoked: skill.name
                }
            };
        }

        const msgRecord = await CopilotMessage.create({
            conversationId,
            role: 'assistant',
            content: finalOutput.content,
            explainability: {
                ...finalOutput.explainability,
                skillInvoked: skill.name
            }
        });

        // Send final message payload
        res.write(`data: ${JSON.stringify({ done: true, message: msgRecord })}\n\n`);
        res.end();
    }

    async getRecommendations(category = null) {
        const query = { status: 'ACTIVE' };
        if (category) query.category = category;
        return CopilotRecommendation.find(query).sort({ confidence: -1 });
    }
}

export default new CopilotService();
