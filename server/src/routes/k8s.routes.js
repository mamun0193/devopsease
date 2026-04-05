import { Router } from 'express';
import authMiddleware from '../middlewares/auth.middleware.js';
import {
    generateDeploymentYamlAction,
    generateServiceYamlAction,
    generateIngressYamlAction,
} from '../controllers/k8s.controller.js';

const router = Router();

router.post('/deployments/generate', authMiddleware, generateDeploymentYamlAction);
router.post('/services/generate', authMiddleware, generateServiceYamlAction);
router.post('/ingress/generate', authMiddleware, generateIngressYamlAction);

export default router;
