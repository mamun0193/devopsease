import express from 'express';
import { analyzeRepository } from '../intelligence/intelligence.service.js';
import { requireAuth } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/intelligence/:repoId', requireAuth, async (req, res, next) => {
    try {
        const { repoId } = req.params;
        const analysis = await analyzeRepository(repoId);
        res.json({ analysis });
    } catch (error) {
        next(error);
    }
});

export default router;
