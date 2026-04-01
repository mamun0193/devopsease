import { Router } from 'express';
import authMiddleware from '../middlewares/auth.middleware.js';
import {
    getDeployments,
    getDeploymentById,
    getDeploymentLogs,
    stopDeploymentAction,
    removeDeploymentAction,
    rollbackDeploymentAction,
    scaleDeploymentAction,
} from '../controllers/deployment.controller.js';

const router = Router();

router.get('/', authMiddleware, getDeployments);
router.get('/:id', authMiddleware, getDeploymentById);
router.get('/:id/logs', authMiddleware, getDeploymentLogs);
router.post('/:id/stop', authMiddleware, stopDeploymentAction);
router.post('/:id/remove', authMiddleware, removeDeploymentAction);
router.post('/:id/rollback', authMiddleware, rollbackDeploymentAction);
router.post('/:id/scale', authMiddleware, scaleDeploymentAction);

export default router;
