import { getSnapshotByDeployment, compareSnapshots } from '../services/configSnapshot.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { standardResponse } from '../utils/apiResponse.js';
import { ValidationError, NotFoundError } from '../utils/AppError.js';

// ConfigSnapshot Controller — Deployment configuration snapshots.

export const getSnapshot = asyncHandler(async (req, res) => {
        const { deploymentId } = req.params;

        const snapshot = await getSnapshotByDeployment(deploymentId);
        if (!snapshot) {
            throw new NotFoundError('No config snapshot found for this deployment');
        }

        res.json(standardResponse({ snapshot }));
});

export const compareDeploymentSnapshots = asyncHandler(async (req, res) => {
        const { from, to } = req.query;

        if (!from || !to) {
            throw new ValidationError('from and to deployment IDs are required as query parameters');
        }

        const diff = await compareSnapshots(from, to);
        res.json(standardResponse({ diff }));
});
