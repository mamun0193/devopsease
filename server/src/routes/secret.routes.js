import { Router } from 'express';
import authMiddleware from '../middlewares/auth.middleware.js';
import {
    createSecretAction,
    getSecretsAction,
    updateSecretAction,
    deleteSecretAction,
} from '../controllers/secret.controller.js';

const router = Router();

router.post('/', authMiddleware, createSecretAction);
router.get('/', authMiddleware, getSecretsAction);
router.put('/:id', authMiddleware, updateSecretAction);
router.delete('/:id', authMiddleware, deleteSecretAction);

export default router;
