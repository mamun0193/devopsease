import { Router } from 'express';
import authMiddleware from '../middlewares/auth.middleware.js';
import {
    createPipeline,
    listPipelines,
    getPipeline,
    deletePipeline
} from '../controllers/pipeline.controller.js';

const router = Router();

router.post('/', authMiddleware, createPipeline);
router.get('/', authMiddleware, listPipelines);
router.get('/:id', authMiddleware, getPipeline);
router.delete('/:id', authMiddleware, deletePipeline);

export default router;
