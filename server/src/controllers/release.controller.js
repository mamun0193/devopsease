import Release from '../models/release.model.js';
import ReleaseManifest from '../models/releaseManifest.model.js';
import releaseService from '../services/release.service.js';

export const getReleases = async (req, res, next) => {
    try {
        const query = {};
        if (req.query.applicationId) {
            query.applicationId = req.query.applicationId;
        }
        
        const releases = await Release.find(query)
            .sort({ createdAt: -1 })
            .populate('manifestId');

        res.json(releases);
    } catch (error) {
        next(error);
    }
};

export const getReleaseById = async (req, res, next) => {
    try {
        const release = await Release.findById(req.params.id).populate('manifestId');
        if (!release) return res.status(404).json({ error: 'Release not found' });
        res.json(release);
    } catch (error) {
        next(error);
    }
};

export const promoteRelease = async (req, res, next) => {
    try {
        const release = await releaseService.transitionState(req.params.id, 'Promoting', req.body.reason, String(req.user?._id || 'Platform'));
        res.json(release);
    } catch (error) {
        next(error);
    }
};

export const rollbackRelease = async (req, res, next) => {
    try {
        const release = await releaseService.transitionState(req.params.id, 'RolledBack', req.body.reason, String(req.user?._id || 'Platform'));
        res.json(release);
    } catch (error) {
        next(error);
    }
};
