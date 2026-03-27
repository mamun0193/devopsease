import { Router } from 'express';
import authMiddleware from '../middlewares/auth.middleware.js';
import { getDeployments } from '../controllers/deployment.controller.js';

const router = Router();

router.get('/', authMiddleware, getDeployments);

export default router;
