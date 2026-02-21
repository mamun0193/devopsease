import { Router } from 'express';
import authMiddleware from '../middlewares/auth.middleware.js';
import { prunePreview, pruneUnused, pruneBuildCache } from '../controllers/imageGovernance.controller.js';

const router = Router();

router.get('/prune-preview', authMiddleware, prunePreview);
router.post('/prune-unused', authMiddleware, pruneUnused);
router.post('/prune-build-cache', authMiddleware, pruneBuildCache);

export default router;
