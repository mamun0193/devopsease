import copilotService from '../ai/copilot.service.js';

class AiController {
    async createConversation(req, res) {
        try {
            const { title } = req.body;
            const conversation = await copilotService.createConversation(req.user._id, title);
            res.status(201).json(conversation);
        } catch (error) {
            res.status(500).json({ error: 'Failed to create conversation', details: error.message });
        }
    }

    async getConversations(req, res) {
        try {
            const { CopilotConversation } = await import('../models/copilotConversation.model.js');
            // Hacky import to avoid circular dependency if needed, but normally use model directly
            // Actually let's just use the service. We'll add a method or import it here directly.
        } catch (e) {}
    }
    
    // Using simple model query for lists
    async getMyConversations(req, res) {
        try {
            const { default: CopilotConversation } = await import('../models/copilotConversation.model.js');
            const conversations = await CopilotConversation.find({ userId: req.user._id, status: 'ACTIVE' }).sort({ updatedAt: -1 });
            res.json(conversations);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch conversations', details: error.message });
        }
    }

    async getConversationMessages(req, res) {
        try {
            const { id } = req.params;
            const messages = await copilotService.getMessages(id);
            res.json(messages);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch messages', details: error.message });
        }
    }

    async streamMessage(req, res) {
        try {
            const { id } = req.params;
            const { message } = req.body;
            
            if (!message) {
                return res.status(400).json({ error: 'Message content is required' });
            }

            await copilotService.handleMessageStream(id, req.user._id, message, res);
        } catch (error) {
            // If headers are already sent, SSE stream is broken, just end it
            if (!res.headersSent) {
                res.status(500).json({ error: 'Failed to process message', details: error.message });
            } else {
                res.write(`data: ${JSON.stringify({ error: 'Failed to generate response' })}\n\n`);
                res.end();
            }
        }
    }

    async addContext(req, res) {
        try {
            const { id } = req.params;
            const { knowledgeType, resourceId } = req.body;
            const context = await copilotService.addContext(id, knowledgeType, resourceId);
            res.json(context);
        } catch (error) {
            res.status(500).json({ error: 'Failed to add context', details: error.message });
        }
    }

    async getRecommendations(req, res) {
        try {
            const { category } = req.query;
            const recs = await copilotService.getRecommendations(category);
            res.json(recs);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch recommendations', details: error.message });
        }
    }
}

export default new AiController();
