import copilotService from '../ai/copilot.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { standardResponse } from '../utils/apiResponse.js';
import { ValidationError } from '../utils/AppError.js';

class AiController {
    createConversation = asyncHandler(async (req, res) => {
        const { title } = req.body;
        const conversation = await copilotService.createConversation(req.user._id, title);
        res.status(201).json(standardResponse(conversation));
    });

    getConversations = asyncHandler(async (req, res) => {
        const { CopilotConversation } = await import('../models/copilotConversation.model.js');
        // Actually let's just use the service. We'll add a method or import it here directly.
    });
    
    // Using simple model query for lists
    getMyConversations = asyncHandler(async (req, res) => {
        const { default: CopilotConversation } = await import('../models/copilotConversation.model.js');
        const conversations = await CopilotConversation.find({ userId: req.user._id, status: 'ACTIVE' }).sort({ updatedAt: -1 });
        res.json(standardResponse(conversations));
    });

    getConversationMessages = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const messages = await copilotService.getMessages(id);
        res.json(standardResponse(messages));
    });

    // Keeping streamMessage with try/catch due to specific SSE error handling
    async streamMessage(req, res, next) {
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
                // Not using standardResponse here because frontend expects { error, details } in the stream fallback maybe, or we can use next
                next(error);
            } else {
                res.write(`data: ${JSON.stringify({ error: 'Failed to generate response' })}\n\n`);
                res.end();
            }
        }
    }

    addContext = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { knowledgeType, resourceId } = req.body;
        const context = await copilotService.addContext(id, knowledgeType, resourceId);
        res.json(standardResponse(context));
    });

    getRecommendations = asyncHandler(async (req, res) => {
        const { category } = req.query;
        const recs = await copilotService.getRecommendations(category);
        res.json(standardResponse(recs));
    });
}

export default new AiController();
