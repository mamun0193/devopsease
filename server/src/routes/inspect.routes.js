import express from 'express';
import { inspectContainer } from '../services/containerInspect.service.js';

const router = express.Router();

/**
 * GET /containers/:id/inspect
 * Returns raw Docker inspect data for observability
 */
router.get('/containers/:id/inspect', async (req, res, next) => {
  try {
    const { id } = req.params;
    const inspect = await inspectContainer(id);

    res.status(200).json({
      success: true,
      data: inspect,
      message: 'Container inspection completed successfully'
    });
  } catch (err) {
    next(err);
  }
});

export default router;
