import { Router } from 'express';
import authMiddleware from '../middlewares/auth.middleware.js';
import { connectRepository, getRepositories, deleteRepository } from '../controllers/repository.controller.js';

const router = Router();

router.post('/connect', authMiddleware, connectRepository);
router.get('/', authMiddleware, getRepositories);
router.delete('/:id', authMiddleware, deleteRepository);

export default router;
