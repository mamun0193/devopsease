import Release from '../models/release.model.js';
import ReleaseManifest from '../models/releaseManifest.model.js';
import releaseService from '../services/release.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { standardResponse } from '../utils/apiResponse.js';
import { NotFoundError } from '../utils/AppError.js';

export const getReleases = asyncHandler(async (req, res) => {
        const query = {};
        if (req.query.applicationId) {
            query.applicationId = req.query.applicationId;
        }
        
        const releases = await Release.find(query)
            .sort({ createdAt: -1 })
            .populate('manifestId');

        res.json(standardResponse(releases));
});

export const getReleaseById = asyncHandler(async (req, res) => {
    const release = await Release.findById(req.params.id).populate('manifestId');
    if (!release) {
        throw new NotFoundError('Release not found');
    }
    res.json(standardResponse(release));
});

export const promoteRelease = asyncHandler(async (req, res) => {
    const release = await releaseService.transitionState(req.params.id, 'Promoting', req.body.reason, String(req.user?._id || 'Platform'));
    res.json(standardResponse(release));
});

export const rollbackRelease = asyncHandler(async (req, res) => {
    const release = await releaseService.transitionState(req.params.id, 'RolledBack', req.body.reason, String(req.user?._id || 'Platform'));
    res.json(standardResponse(release));
});
