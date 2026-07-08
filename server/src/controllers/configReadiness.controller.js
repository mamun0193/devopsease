import { getReadinessReport } from '../services/configReadiness.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { standardResponse } from '../utils/apiResponse.js';
import { ValidationError } from '../utils/AppError.js';

// ConfigReadiness Controller — Multi-dimensional readiness reports.

export const getReadiness = asyncHandler(async (req, res) => {
        const { repositoryId, environmentId } = req.params;

        if (!repositoryId || !environmentId) {
            throw new ValidationError('repositoryId and environmentId are required');
        }

        const report = await getReadinessReport(repositoryId, environmentId);
        res.json(standardResponse({ report }));
});
