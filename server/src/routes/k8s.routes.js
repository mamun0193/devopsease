import { Router } from 'express';
import authMiddleware from '../middlewares/auth.middleware.js';
import { generateDeploymentYamlAction } from '../controllers/k8s.controller.js';

const router = Router();

router.post('/deployments/generate', authMiddleware, generateDeploymentYamlAction);

export default router;
