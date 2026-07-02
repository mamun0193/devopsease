import { Router } from 'express';
import { getReleases, getReleaseById, promoteRelease, rollbackRelease } from '../controllers/release.controller.js';
import authMiddleware from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/', authMiddleware, getReleases);
router.get('/:id', authMiddleware, getReleaseById);
router.post('/:id/promote', authMiddleware, promoteRelease);
router.post('/:id/rollback', authMiddleware, rollbackRelease);

export default router;
