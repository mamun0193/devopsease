import express from 'express';
import aiController from '../controllers/ai.controller.js';
import authMiddleware from '../middlewares/auth.middleware.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/conversations', aiController.getMyConversations);
router.post('/conversations', aiController.createConversation);
router.get('/conversations/:id/messages', aiController.getConversationMessages);
router.post('/conversations/:id/messages', aiController.streamMessage);
router.post('/conversations/:id/context', aiController.addContext);

router.get('/recommendations', aiController.getRecommendations);

export default router;
