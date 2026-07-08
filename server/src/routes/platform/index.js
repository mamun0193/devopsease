import express from "express";
import { platformAuth, requireCapabilities } from "../../middlewares/platformAuth.middleware.js";
import { PlatformCapabilities } from "../../platform/security/CapabilityRegistry.js";

const router = express.Router();

// Apply platform authentication to all routes in this namespace
router.use(platformAuth);

/**
 * @route GET /api/v1/platform/repositories
 * @desc Get all repositories (Platform API)
 * @access Private (Requires REPOSITORY_READ capability)
 */
router.get("/repositories", requireCapabilities([PlatformCapabilities.REPOSITORY_READ]), async (req, res) => {
  // Simple offset/limit pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const skip = (page - 1) * limit;

  // In a real implementation this uses the DB Model: Repository.find().skip(skip).limit(limit)
  // Since this is a platform stub, we mock the DB response
  const totalCount = 1;

  res.json({
    data: [
      {
        id: "repo-123",
        name: "example-repo",
        url: "https://github.com/example/repo",
      },
    ],
    meta: {
      totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit)
    }
  });
});

/**
 * @route POST /api/v1/platform/deployments
 * @desc Trigger a deployment (Platform API)
 * @access Private (Requires DEPLOYMENT_EXECUTE capability)
 */
router.post("/deployments", requireCapabilities([PlatformCapabilities.DEPLOYMENT_EXECUTE]), (req, res) => {
  res.status(202).json({
    data: {
      id: "deploy-456",
      status: "queued",
    }
  });
});

export default router;
