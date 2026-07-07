import express from 'express';
import aiController from '../controllers/ai.controller.js';
import { requireAuth } from '../middlewares/requireAuth.js';

const router = express.Router();

router.use(requireAuth);

router.get('/conversations', aiController.getMyConversations);
router.post('/conversations', aiController.createConversation);
router.get('/conversations/:id/messages', aiController.getConversationMessages);
router.post('/conversations/:id/messages', aiController.streamMessage);
router.post('/conversations/:id/context', aiController.addContext);

router.get('/recommendations', aiController.getRecommendations);

export default router;
