import { Router } from 'express';
import authMiddleware from '../middlewares/auth.middleware.js';
import {
    createProject,
    listProjects,
    getProject,
    startProject,
    stopProject,
    deleteProject
} from '../controllers/project.controller.js';

const router = Router();

router.post('/', authMiddleware, createProject);
router.get('/', authMiddleware, listProjects);
router.get('/:id', authMiddleware, getProject);
router.post('/:id/start', authMiddleware, startProject);
router.post('/:id/stop', authMiddleware, stopProject);
router.delete('/:id', authMiddleware, deleteProject);

export default router;
