import { Router } from 'express';
import authMiddleware from '../middlewares/auth.middleware.js';
import {
    connectClusterAction,
    getClusters,
    getClusterPodsAction,
    getClusterNamespacesAction,
} from '../controllers/cluster.controller.js';

const router = Router();

router.post('/connect', authMiddleware, connectClusterAction);
router.get('/', authMiddleware, getClusters);
router.get('/:id/pods', authMiddleware, getClusterPodsAction);
router.get('/:id/namespaces', authMiddleware, getClusterNamespacesAction);

export default router;
