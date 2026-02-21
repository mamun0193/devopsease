import imageGovernanceService from '../services/imageGovernance.service.js';
import { logGovernanceEvent, GOVERNANCE_EVENTS } from '../services/imageGovernance.audit.js';

export const prunePreview = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const result = await imageGovernanceService.getPruneCandidates(userId);

        logGovernanceEvent({
            event: GOVERNANCE_EVENTS.IMAGE_PRUNE_PREVIEW,
            userId,
            metadata: { candidateCount: result.candidates.length, totalReclaimableMB: result.totalReclaimableMB }
        });

        res.json(result);
    } catch (error) {
        next(error);
    }
};

export const pruneUnused = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const result = await imageGovernanceService.executeSafePrune(userId);
        res.json(result);
    } catch (error) {
        next(error);
    }
};

export const pruneBuildCache = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const result = await imageGovernanceService.pruneBuildCache(userId);
        res.json(result);
    } catch (error) {
        next(error);
    }
};
