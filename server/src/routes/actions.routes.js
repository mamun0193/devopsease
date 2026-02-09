import express from "express";
import actionHistoryService from "../services/actionHistory.service.js";
import AppError from "../utils/AppError.js";

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const { containerId, limit, cursor } = req.query;

    const parsedLimit = limit ? parseInt(limit, 10) : 50;

    if (parsedLimit < 1 || parsedLimit > 200) {
      throw new AppError("Limit must be between 1 and 200", 400);
    }

    console.log('📊 Actions API called:', { containerId, limit: parsedLimit, cursor });

    const result = await actionHistoryService.getActions({
      containerId,
      limit: parsedLimit,
      cursor,
    });

    console.log('📊 Actions result:', {
      totalItems: result.items.length,
      hasNextCursor: !!result.nextCursor,
      containerId,
    });

    res.status(200).json({
      success: true,
      data: result,
      message: "Action history retrieved successfully",
    });
  } catch (err) {
    next(err);
  }
});

router.get("/stats", async (req, res, next) => {
  try {
    const stats = await actionHistoryService.getStats();

    console.log('📈 Stats requested:', stats);

    res.status(200).json({
      success: true,
      data: stats,
      message: "Action history stats retrieved successfully",
    });
  } catch (err) {
    next(err);
  }
});

// Debug endpoint - get ALL actions without filtering
router.get("/debug/all", async (req, res, next) => {
  try {
    const result = await actionHistoryService.getActions({ limit: 10 });

    res.status(200).json({
      success: true,
      data: {
        total: result.items.length,
        actions: result.items,
      },
      message: "Debug: All actions",
    });
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    const action = await actionHistoryService.getActionById(id);

    if (!action) {
      throw new AppError(`Action ${id} not found`, 404);
    }

    res.status(200).json({
      success: true,
      data: action,
      message: "Action retrieved successfully",
    });
  } catch (err) {
    next(err);
  }
});

export default router;
