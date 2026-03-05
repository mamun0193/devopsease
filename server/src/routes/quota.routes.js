import { Router } from "express";
import authMiddleware from "../middlewares/auth.middleware.js";
import quotaService from "../services/quota.service.js";

const router = Router();

// All quota routes require authentication
router.use(authMiddleware);

// GET /quota - Retrieve the user's quota (auto-create if not exists)

router.get("/", async (req, res, next) => {
  try {
    const quota = await quotaService.getOrCreateQuota(
      req.user._id,
      req.user.plan
    );

    res.status(200).json({
      success: true,
      data: quotaService.formatQuotaResponse(quota),
      message: "Quota retrieved successfully",
    });
  } catch (err) {
    next(err);
  }
});

export default router;
