import { Router } from 'express';
import authMiddleware from '../middlewares/auth.middleware.js';
import { cloneRepo, pullRepo, checkoutRepo } from '../controllers/git.controller.js';

const router = Router();

router.post('/clone/:repoId', authMiddleware, cloneRepo);
router.post('/pull/:repoId', authMiddleware, pullRepo);
router.post('/checkout/:repoId', authMiddleware, checkoutRepo);

export default router;
