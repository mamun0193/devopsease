import { Router } from 'express';
import authMiddleware from '../middlewares/auth.middleware.js';
import { rateLimiter } from '../middlewares/rateLimit.middleware.js';
import {
    createPipeline,
    listPipelines,
    getPipeline,
    deletePipeline,
    togglePipelineStatus,
    runPipeline,
    getPipelineStatus,
    listPipelineRuns,
    getPipelineMetrics
} from '../controllers/pipeline.controller.js';

const router = Router();

router.post('/', authMiddleware, rateLimiter('create'), createPipeline);
router.get('/', authMiddleware, listPipelines);
router.post('/:id/run', authMiddleware, rateLimiter('exec'), runPipeline);
router.patch('/:id/status', authMiddleware, togglePipelineStatus);
router.get('/:id/status', authMiddleware, getPipelineStatus);
router.get('/:id/runs', authMiddleware, listPipelineRuns);
router.get('/:id/metrics', authMiddleware, getPipelineMetrics);
router.get('/:id', authMiddleware, getPipeline);
router.delete('/:id', authMiddleware, rateLimiter('destructive'), deletePipeline);

export default router;
