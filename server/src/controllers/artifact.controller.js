import { generateArtifacts } from '../generators/generator.service.js';
import logger from '../utils/logger.js';

export const getArtifacts = async (req, res) => {
    try {
        const { repoId } = req.params;

        if (!repoId) {
            return res.status(400).json({
                success: false,
                error: 'Repository ID is required',
            });
        }

        const artifactBundle = await generateArtifacts(repoId);

        res.status(200).json({
            success: true,
            data: artifactBundle,
        });
    } catch (error) {
        logger.error(`Error generating artifacts for repo ${req.params.repoId}:`, error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate deployment artifacts',
            details: error.message,
        });
    }
};
