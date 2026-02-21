import { Router } from 'express';
import authMiddleware from '../middlewares/auth.middleware.js';
import { listImages, getUsageSummary, getImageById } from '../controllers/image.controller.js';
import imageGovernanceRoutes from './imageGovernance.routes.js';

const router = Router();

router.use('/', imageGovernanceRoutes);
router.get('/usage-summary', authMiddleware, getUsageSummary);
router.get('/:imageId', authMiddleware, getImageById);
router.get('/', authMiddleware, listImages);

export default router;
