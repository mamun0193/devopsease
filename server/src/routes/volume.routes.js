import { Router } from 'express';
import authMiddleware from '../middlewares/auth.middleware.js';
import {
    listVolumes,
    getPrunePreview,
    pruneUnused,
    reconcileVolumes
} from '../controllers/volume.controller.js';

const router = Router();

router.get('/', authMiddleware, listVolumes);
router.get('/prune-preview', authMiddleware, getPrunePreview);
router.post('/prune-unused', authMiddleware, pruneUnused);
router.post('/reconcile', authMiddleware, reconcileVolumes);

export default router;
