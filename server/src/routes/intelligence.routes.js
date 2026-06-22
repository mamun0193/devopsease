import express from 'express';
import { analyzeRepository } from '../intelligence/intelligence.service.js';
import authMiddleware from '../middlewares/auth.middleware.js';

const router = express.Router();

router.get('/intelligence/:repoId', authMiddleware, async (req, res, next) => {
    try {
        const { repoId } = req.params;
        const analysis = await analyzeRepository(repoId);
        res.json({ analysis });
    } catch (error) {
        next(error);
    }
});

export default router;
