import { Router } from 'express';
import authMiddleware from '../middlewares/auth.middleware.js';
import { rateLimiter } from '../middlewares/rateLimit.middleware.js';
import {
    getDeployments,
    getDeploymentById,
    getDeploymentLogs,
    startDeploymentAction,
    stopDeploymentAction,
    removeDeploymentAction,
    rollbackDeploymentAction,
    scaleDeploymentAction,
} from '../controllers/deployment.controller.js';

const router = Router();

router.get('/', authMiddleware, getDeployments);
router.get('/:id', authMiddleware, getDeploymentById);
router.get('/:id/logs', authMiddleware, getDeploymentLogs);
router.post('/:id/start', authMiddleware, rateLimiter('exec'), startDeploymentAction);
router.post('/:id/stop', authMiddleware, rateLimiter('destructive'), stopDeploymentAction);
router.post('/:id/remove', authMiddleware, rateLimiter('destructive'), removeDeploymentAction);
router.post('/:id/rollback', authMiddleware, rateLimiter('destructive'), rollbackDeploymentAction);
router.post('/:id/scale', authMiddleware, rateLimiter('exec'), scaleDeploymentAction);

import {
    executeDeployment,
    getExecution,
    getExecutionLogs,
    rollbackExecution
} from '../controllers/execution.controller.js';

router.post('/execute/:artifactRevisionId', authMiddleware, rateLimiter('exec'), executeDeployment);
router.get('/executions/:id', authMiddleware, getExecution);
router.get('/executions/:id/logs', authMiddleware, getExecutionLogs);
router.post('/executions/:id/rollback', authMiddleware, rateLimiter('destructive'), rollbackExecution);

export default router;
