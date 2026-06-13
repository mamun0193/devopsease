import { Router } from 'express';
import authMiddleware from '../middlewares/auth.middleware.js';
import { getPipelineRun, streamPipelineLogs } from '../controllers/pipeline.controller.js';

const router = Router();

router.get('/:id', authMiddleware, getPipelineRun);
router.get('/:id/logs', authMiddleware, streamPipelineLogs);

export default router;
