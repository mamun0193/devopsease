import { Router } from 'express';
import authMiddleware from '../middlewares/auth.middleware.js';
import {
    createTunnel,
    listTunnels,
    revokeTunnel
} from '../controllers/tunnel.controller.js';

const router = Router();

// All routes require authentication; all operations are scoped to req.user._id

// Create a temporary public tunnel for a container port
router.post('/', authMiddleware, createTunnel);

// List all tunnels for the authenticated user
router.get('/', authMiddleware, listTunnels);

// Revoke an active tunnel
router.delete('/:id', authMiddleware, revokeTunnel);

export default router;
