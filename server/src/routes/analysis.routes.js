import express from 'express';
import { analyzeContainer } from '../services/containerAnalysis.service.js';

const router = express.Router();

/*
 * GET /containers/:id/analysis
 * Returns failure analysis and explanation for a container
 */
router.get('/containers/:id/analysis', async (req, res, next) => {
  try {
    const { id } = req.params;

    const analysis = await analyzeContainer(id);

    res.status(200).json({
      success: true,
      data: analysis,
      message: 'Container analysis completed successfully'
    });
  } catch (err) {
    next(err);
  }
});

export default router;
