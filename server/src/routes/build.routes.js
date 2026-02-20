import { Router } from 'express';
import authMiddleware from '../middlewares/auth.middleware.js';
import { triggerBuild, listBuilds, getBuild, listImages } from '../controllers/build.controller.js';

const router = Router();

router.post('/', authMiddleware, triggerBuild);
router.get('/', authMiddleware, listBuilds);
router.get('/images', authMiddleware, listImages);
router.get('/:id', authMiddleware, getBuild);

export default router;
