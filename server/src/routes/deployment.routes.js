import { Router } from 'express';
import authMiddleware from '../middlewares/auth.middleware.js';
import {
    getDeployments,
    stopDeploymentAction,
    removeDeploymentAction,
    rollbackDeploymentAction,
} from '../controllers/deployment.controller.js';

const router = Router();

router.get('/', authMiddleware, getDeployments);
router.post('/:id/stop', authMiddleware, stopDeploymentAction);
router.post('/:id/remove', authMiddleware, removeDeploymentAction);
router.post('/:id/rollback', authMiddleware, rollbackDeploymentAction);

export default router;
