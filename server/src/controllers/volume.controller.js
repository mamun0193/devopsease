import Volume from '../models/volume.model.js';
import volumeService from '../services/volume.service.js';
import volumeGovernance from '../services/volumeGovernance.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { standardResponse } from '../utils/apiResponse.js';

// GET /volumes — list all volumes owned by the authenticated user
export const listVolumes = asyncHandler(async (req, res) => {
        const userId = req.user._id;
        const volumes = await Volume.find({ userId })
            .select('-__v')
            .sort({ createdAt: -1 })
            .lean();
        res.json(standardResponse({ volumes }));
});

// GET /volumes/prune-preview — get prune candidates
export const getPrunePreview = asyncHandler(async (req, res) => {
        const userId = req.user._id;
    const result = await volumeGovernance.getPruneCandidates(userId);
    res.json(standardResponse(result));
});

// POST /volumes/prune-unused — execute safe prune
export const pruneUnused = asyncHandler(async (req, res) => {
        const userId = req.user._id;
    const result = await volumeGovernance.executeSafePrune(userId);
    res.json(standardResponse(result, 'Volume prune complete'));
});

// POST /volumes/reconcile — reconcile DB records against Docker state
export const reconcileVolumes = asyncHandler(async (req, res) => {
        const userId = req.user._id;
    const result = await volumeService.reconcileVolumes(userId);
    res.json(standardResponse(result, 'Reconciliation complete'));
});
