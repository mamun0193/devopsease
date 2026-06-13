import { Router } from 'express';
import authMiddleware from '../middlewares/auth.middleware.js';
import {
    createPipeline,
    listPipelines,
    getPipeline,
    deletePipeline,
    runPipeline,
    getPipelineStatus,
    listPipelineRuns,
    getPipelineMetrics
} from '../controllers/pipeline.controller.js';

const router = Router();

router.post('/', authMiddleware, createPipeline);
router.get('/', authMiddleware, listPipelines);
router.post('/:id/run', authMiddleware, runPipeline);
router.get('/:id/status', authMiddleware, getPipelineStatus);
router.get('/:id/runs', authMiddleware, listPipelineRuns);
router.get('/:id/metrics', authMiddleware, getPipelineMetrics);
router.get('/:id', authMiddleware, getPipeline);
router.delete('/:id', authMiddleware, deletePipeline);

export default router;
