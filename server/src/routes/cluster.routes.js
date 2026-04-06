import { Router } from 'express';
import authMiddleware from '../middlewares/auth.middleware.js';
import {
    connectClusterAction,
    getClusters,
    getClusterPodsAction,
    getClusterNamespacesAction,
    createNamespaceAction,
    deleteNamespaceAction,
    getPodLogsAction,
} from '../controllers/cluster.controller.js';

const router = Router();

router.post('/connect', authMiddleware, connectClusterAction);
router.get('/', authMiddleware, getClusters);
router.get('/:id/pods', authMiddleware, getClusterPodsAction);
router.get('/:id/pods/:podName/logs', authMiddleware, getPodLogsAction);
router.get('/:id/namespaces', authMiddleware, getClusterNamespacesAction);
router.post('/:id/namespaces', authMiddleware, createNamespaceAction);
router.delete('/:id/namespaces/:name', authMiddleware, deleteNamespaceAction);

export default router;
