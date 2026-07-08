import buildService from '../services/build.service.js';
import Repository from '../models/repository.model.js';
import Image from '../models/image.js';
import Build from '../models/build.model.js';
import BuildManifest from '../models/buildManifest.model.js';
import { createLogReadStream } from '../services/buildLog.service.js';
import { runBuildPipeline } from '../services/build.service.js';
import logger from '../utils/logger.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { standardResponse } from '../utils/apiResponse.js';
import { ValidationError, NotFoundError } from '../utils/AppError.js';

export const triggerBuild = asyncHandler(async (req, res) => {
        const { tag, dockerfile } = req.body;
        const userId = req.user._id;

        if (!tag || !dockerfile) {
            throw new ValidationError('tag and dockerfile are required');
        }

        if (typeof tag !== 'string' || tag.length > 128) {
            throw new ValidationError('tag must be a string under 128 characters');
        }

        if (typeof dockerfile !== 'string') {
            throw new ValidationError('dockerfile must be a string');
        }

        const build = await buildService.startBuild(userId, tag, dockerfile);

        res.status(202).json(standardResponse({
            buildId: build._id,
            tag: build.tag,
            status: build.status,
            wsUrl: `/ws/build/${build._id}`
        }, 'Build started'));
});

export const listBuilds = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const builds = await buildService.getUserBuilds(userId);
    res.json(standardResponse({ builds }));
});

export const getBuild = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { id } = req.params;

    const build = await buildService.getBuildById(id, userId);
    if (!build) {
        throw new NotFoundError('Build not found');
    }

    res.json(standardResponse({ build }));
});

// Stream build logs from the filesystem.
 
export const streamBuildLogs = asyncHandler(async (req, res) => {
        const userId = req.user._id;
        const { id } = req.params;

        const build = await Build.findOne({ _id: id, userId })
            .select('storage logSummary logs')
            .lean();

        if (!build) {
            throw new NotFoundError('Build not found');
        }

        // Prefer filesystem logs (new builds)
        if (build.storage) {
            const stream = createLogReadStream(build.storage);
            if (stream) {
                res.setHeader('Content-Type', 'text/plain; charset=utf-8');
                res.setHeader('Cache-Control', 'no-cache');
                stream.pipe(res);
                stream.on('error', (err) => {
                    logger.error('Error streaming build logs', { buildId: id, error: err.message });
                    if (!res.headersSent) {
                        res.status(500).json({ message: 'Failed to read build logs' });
                    }
                });
                return;
            }
        }

        // Legacy fallback: logSummary or in-document logs array
        const content = build.logSummary || (build.logs || []).join('\n');
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.send(content);
});

export const listImages = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const images = await Image.find({ userId })
        .select('tag sizeMB layerCount createdAt')
        .sort({ createdAt: -1 })
        .lean();
    res.json(standardResponse({ images }));
});

export const getBuildManifest = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user._id;

    const build = await Build.findOne({ _id: id, userId });
    if (!build) throw new NotFoundError('Build not found');
    if (!build.manifestId) throw new NotFoundError('No Build Manifest found for this build');

    const manifest = await BuildManifest.findById(build.manifestId).lean();
    if (!manifest) throw new NotFoundError('Manifest document missing');

    res.json(standardResponse({ manifest }));
});

export const getCacheAnalytics = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    
    const manifests = await BuildManifest.find({ userId, strategy: { $ne: 'UNKNOWN' } }).lean();
    
    const totalBuilds = manifests.length;
    const cacheHits = manifests.filter(m => m.strategy === 'FULL_REUSE').length;
    const partialHits = manifests.filter(m => m.strategy === 'PARTIAL_REUSE').length;
    
    let totalSavedTimeMs = 0;
    manifests.forEach(m => {
        totalSavedTimeMs += (m.estimatedSavedTimeMs || 0);
    });

    res.json(standardResponse({
        analytics: {
            totalBuilds,
            cacheHits,
            partialHits,
            hitRatePercentage: totalBuilds > 0 ? ((cacheHits + partialHits) / totalBuilds) * 100 : 0,
            totalSavedTimeMs
        }
    }));
});

export const deleteBuild = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user._id;

    const build = await Build.findOneAndDelete({ _id: id, userId });
    if (!build) throw new NotFoundError('Build not found');

    res.json(standardResponse(null, 'Build deleted successfully'));
});

export const deleteAllBuilds = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    await Build.deleteMany({ userId });
    res.json(standardResponse(null, 'All builds deleted successfully'));
});
