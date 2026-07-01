import buildService from '../services/build.service.js';
import Repository from '../models/repository.model.js';
import Image from '../models/image.js';
import Build from '../models/build.model.js';
import BuildManifest from '../models/buildManifest.model.js';
import { createLogReadStream } from '../services/buildLog.service.js';
import { runBuildPipeline } from '../services/build.service.js';
import logger from '../utils/logger.js';

export const triggerBuild = async (req, res, next) => {
    try {
        const { tag, dockerfile } = req.body;
        const userId = req.user._id;

        if (!tag || !dockerfile) {
            return res.status(400).json({ message: 'tag and dockerfile are required' });
        }

        if (typeof tag !== 'string' || tag.length > 128) {
            return res.status(400).json({ message: 'tag must be a string under 128 characters' });
        }

        if (typeof dockerfile !== 'string') {
            return res.status(400).json({ message: 'dockerfile must be a string' });
        }

        const build = await buildService.startBuild(userId, tag, dockerfile);

        res.status(202).json({
            message: 'Build started',
            buildId: build._id,
            tag: build.tag,
            status: build.status,
            wsUrl: `/ws/build/${build._id}`
        });
    } catch (error) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({ message: error.message });
        }
        next(error);
    }
};

export const listBuilds = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const builds = await buildService.getUserBuilds(userId);
        res.json({ builds });
    } catch (error) {
        next(error);
    }
};

export const getBuild = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { id } = req.params;

        const build = await buildService.getBuildById(id, userId);
        if (!build) {
            return res.status(404).json({ message: 'Build not found' });
        }

        res.json({ build });
    } catch (error) {
        next(error);
    }
};

// Stream build logs from the filesystem.
 
export const streamBuildLogs = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { id } = req.params;

        const build = await Build.findOne({ _id: id, userId })
            .select('storage logSummary logs')
            .lean();

        if (!build) {
            return res.status(404).json({ message: 'Build not found' });
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
    } catch (error) {
        next(error);
    }
};

export const listImages = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const images = await Image.find({ userId })
            .select('tag sizeMB layerCount createdAt')
            .sort({ createdAt: -1 })
            .lean();
        res.json({ images });
    } catch (error) {
        next(error);
    }
};

export const getBuildManifest = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        const build = await Build.findOne({ _id: id, userId });
        if (!build) return res.status(404).json({ message: 'Build not found' });
        if (!build.manifestId) return res.status(404).json({ message: 'No Build Manifest found for this build' });

        const manifest = await BuildManifest.findById(build.manifestId).lean();
        if (!manifest) return res.status(404).json({ message: 'Manifest document missing' });

        res.json({ manifest });
    } catch (error) {
        next(error);
    }
};

export const getCacheAnalytics = async (req, res, next) => {
    try {
        const userId = req.user._id;
        
        const manifests = await BuildManifest.find({ userId, strategy: { $ne: 'UNKNOWN' } }).lean();
        
        const totalBuilds = manifests.length;
        const cacheHits = manifests.filter(m => m.strategy === 'FULL_REUSE').length;
        const partialHits = manifests.filter(m => m.strategy === 'PARTIAL_REUSE').length;
        
        let totalSavedTimeMs = 0;
        manifests.forEach(m => {
            totalSavedTimeMs += (m.estimatedSavedTimeMs || 0);
        });

        res.json({
            analytics: {
                totalBuilds,
                cacheHits,
                partialHits,
                hitRatePercentage: totalBuilds > 0 ? ((cacheHits + partialHits) / totalBuilds) * 100 : 0,
                totalSavedTimeMs
            }
        });
    } catch (error) {
        next(error);
    }
};

export const deleteBuild = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        const build = await Build.findOneAndDelete({ _id: id, userId });
        if (!build) return res.status(404).json({ message: 'Build not found' });

        // Optionally, we could clean up associated manifest/image here
        // but for now, just removing the build record is fine.

        res.json({ message: 'Build deleted successfully' });
    } catch (error) {
        next(error);
    }
};

export const deleteAllBuilds = async (req, res, next) => {
    try {
        const userId = req.user._id;
        await Build.deleteMany({ userId });
        res.json({ message: 'All builds deleted successfully' });
    } catch (error) {
        next(error);
    }
};
