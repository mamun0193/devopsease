import buildService from '../services/build.service.js';
import Image from '../models/image.js';
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
