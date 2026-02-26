import { Router } from 'express';
import authMiddleware from '../middlewares/auth.middleware.js';
import {
    connectDockerHub,
    disconnectDockerHub,
    getDockerHubStatus,
    pullImage,
    pushImage,
    searchImages
} from '../controllers/dockerHub.controller.js';

const router = Router();

router.post('/connect', authMiddleware, connectDockerHub);
router.delete('/disconnect', authMiddleware, disconnectDockerHub);
router.get('/status', authMiddleware, getDockerHubStatus);
router.post('/pull', authMiddleware, pullImage);
router.post('/push', authMiddleware, pushImage);
router.get('/search', authMiddleware, searchImages);

export default router;
