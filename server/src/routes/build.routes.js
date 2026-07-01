import { Router } from 'express';
import authMiddleware from '../middlewares/auth.middleware.js';
import { rateLimiter } from '../middlewares/rateLimit.middleware.js';
import { triggerBuild, listBuilds, getBuild, listImages, streamBuildLogs, getBuildManifest, getCacheAnalytics, deleteBuild, deleteAllBuilds } from '../controllers/build.controller.js';

const router = Router();

router.post('/', authMiddleware, rateLimiter('create'), triggerBuild);
router.get('/', authMiddleware, listBuilds);
router.get('/images', authMiddleware, listImages);
router.get('/:id/logs', authMiddleware, streamBuildLogs);
router.get('/cache/analytics', authMiddleware, getCacheAnalytics);
router.get('/:id/manifest', authMiddleware, getBuildManifest);
router.get('/:id', authMiddleware, getBuild);
router.delete('/', authMiddleware, deleteAllBuilds);
router.delete('/:id', authMiddleware, deleteBuild);

export default router;
