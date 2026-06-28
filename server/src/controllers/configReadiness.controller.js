import { getReadinessReport } from '../services/configReadiness.service.js';

// ConfigReadiness Controller — Multi-dimensional readiness reports.
 

export const getReadiness = async (req, res, next) => {
    try {
        const { repositoryId, environmentId } = req.params;

        if (!repositoryId || !environmentId) {
            return res.status(400).json({
                message: 'repositoryId and environmentId are required',
            });
        }

        const report = await getReadinessReport(repositoryId, environmentId);

        res.json({ report });
    } catch (error) {
        next(error);
    }
};
