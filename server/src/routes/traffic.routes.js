import { Router } from 'express';
import { getTrafficPolicies, applyTrafficPolicy, getRoutingTable } from '../controllers/traffic.controller.js';
import authMiddleware from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/policies', authMiddleware, getTrafficPolicies);
router.post('/policies', authMiddleware, applyTrafficPolicy);
router.get('/routing-table/:slug', authMiddleware, getRoutingTable);

export default router;
