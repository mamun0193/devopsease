import { generateBlueprint } from '../blueprints/blueprint.service.js';
import logger from '../utils/logger.js';

export const getBlueprint = async (req, res) => {
  try {
    const { repoId } = req.params;

    if (!repoId) {
      return res.status(400).json({
        success: false,
        error: 'Repository ID is required',
      });
    }

    const blueprint = await generateBlueprint(repoId);

    res.status(200).json({
      success: true,
      data: blueprint,
    });
  } catch (error) {
    logger.error('Error generating blueprint:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate blueprint',
      details: error.message,
    });
  }
};
