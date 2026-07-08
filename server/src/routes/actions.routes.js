import express from "express";
import actionHistoryService from "../services/actionHistory.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { standardResponse } from "../utils/apiResponse.js";
import { NotFoundError, ValidationError } from "../utils/AppError.js";

const router = express.Router();

router.get("/", asyncHandler(async (req, res) => {
    const { containerId, limit, cursor } = req.query;

    const parsedLimit = limit ? parseInt(limit, 10) : 50;

    if (parsedLimit < 1 || parsedLimit > 200) {
      throw new ValidationError("Limit must be between 1 and 200");
    }

    const result = await actionHistoryService.getActions({
      containerId,
      limit: parsedLimit,
      cursor,
    });

    res.status(200).json(standardResponse(result, "Action history retrieved successfully"));
}));

router.get("/stats", asyncHandler(async (req, res) => {
    const stats = await actionHistoryService.getStats();
    res.status(200).json(standardResponse(stats, "Action history stats retrieved successfully"));
}));

// Debug endpoint - get ALL actions without filtering
router.get("/debug/all", asyncHandler(async (req, res) => {
    const result = await actionHistoryService.getActions({ limit: 10 });
    res.status(200).json(standardResponse({
        total: result.items.length,
        actions: result.items,
    }, "Debug: All actions"));
}));

router.get("/:id", asyncHandler(async (req, res) => {
    const { id } = req.params;
    const action = await actionHistoryService.getActionById(id);

    if (!action) {
      throw new NotFoundError(`Action ${id} not found`);
    }

    res.status(200).json(standardResponse(action, "Action retrieved successfully"));
}));

// DELETE /actions - Clear action history (optionally for a specific container)
router.delete("/", asyncHandler(async (req, res) => {
    const { containerId } = req.query;
    await actionHistoryService.clear(containerId);

    const message = containerId
        ? `Action history cleared for container ${containerId}`
        : "All action history cleared";

    res.status(200).json(standardResponse(null, message));
}));

export default router;
