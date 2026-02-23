import Volume from '../models/volume.model.js';
import volumeService from '../services/volume.service.js';
import volumeGovernance from '../services/volumeGovernance.service.js';

// GET /volumes — list all volumes owned by the authenticated user
export const listVolumes = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const volumes = await Volume.find({ userId })
            .select('-__v')
            .sort({ createdAt: -1 })
            .lean();
        res.json({ volumes });
    } catch (error) {
        next(error);
    }
};

// GET /volumes/prune-preview — get prune candidates
export const getPrunePreview = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const result = await volumeGovernance.getPruneCandidates(userId);
        res.json(result);
    } catch (error) {
        next(error);
    }
};

// POST /volumes/prune-unused — execute safe prune
export const pruneUnused = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const result = await volumeGovernance.executeSafePrune(userId);
        res.json({ message: 'Volume prune complete', ...result });
    } catch (error) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({ message: error.message });
        }
        next(error);
    }
};

// POST /volumes/reconcile — reconcile DB records against Docker state
export const reconcileVolumes = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const result = await volumeService.reconcileVolumes(userId);
        res.json({ message: 'Reconciliation complete', ...result });
    } catch (error) {
        next(error);
    }
};
