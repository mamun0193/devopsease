import { Router } from 'express';
import authMiddleware from '../middlewares/auth.middleware.js';
import { rateLimiter } from '../middlewares/rateLimit.middleware.js';
import {
    getApplications,
    getApplicationById,
    createApplication,
    updateApplication,
    deleteApplication,
    getApplicationDeployments,
    getApplicationDomains,
    getApplicationMetrics,
    getGatewayMetrics,
} from '../controllers/application.controller.js';

const router = Router();

// Application CRUD
router.get('/', authMiddleware, getApplications);
router.get('/gateway-metrics', authMiddleware, getGatewayMetrics);
router.get('/:id', authMiddleware, getApplicationById);
router.post('/', authMiddleware, rateLimiter('create'), createApplication);
router.patch('/:id', authMiddleware, updateApplication);
router.delete('/:id', authMiddleware, rateLimiter('destructive'), deleteApplication);

// Application sub-resources
router.get('/:id/deployments', authMiddleware, getApplicationDeployments);
router.get('/:id/domains', authMiddleware, getApplicationDomains);
router.get('/:id/metrics', authMiddleware, getApplicationMetrics);

export default router;
