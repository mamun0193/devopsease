import { generateBlueprint } from '../blueprints/blueprint.service.js';
import logger from '../utils/logger.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { standardResponse } from '../utils/apiResponse.js';
import { ValidationError } from '../utils/AppError.js';

export const getBlueprint = asyncHandler(async (req, res) => {
    const { repoId } = req.params;

    if (!repoId) {
      throw new ValidationError('Repository ID is required');
    }

    const blueprint = await generateBlueprint(repoId);

    res.status(200).json(standardResponse(blueprint));
});
