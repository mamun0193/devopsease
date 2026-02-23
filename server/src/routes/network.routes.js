import { Router } from 'express';
import authMiddleware from '../middlewares/auth.middleware.js';
import {
    listNetworks,
    getNetwork,
    deleteNetwork,
    reconcileNetworks
} from '../controllers/network.controller.js';

const router = Router();

// All routes require authentication; all DB queries are scoped to req.user._id inside controllers.

// List all networks owned by the authenticated user
router.get('/', authMiddleware, listNetworks);

// Reconcile live Docker state → must come before /:id to avoid shadowing
router.post('/reconcile', authMiddleware, reconcileNetworks);

// Get a single network (user-scoped)
router.get('/:id', authMiddleware, getNetwork);

// Delete a network — only permitted when usageStatus is UNUSED
router.delete('/:id', authMiddleware, deleteNetwork);

export default router;
