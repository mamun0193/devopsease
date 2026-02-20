import Image from '../models/image.js';
import imageObservabilityService from '../services/imageObservability.service.js';

export const listImages = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const images = await Image.find({ userId })
            .select('tag sizeMB layerCount imageUsageStatus attachedContainerIds lastUsedAt pullCount pulledFrom dockerImageId createdAt')
            .sort({ createdAt: -1 })
            .lean();
        res.json({ images });
    } catch (error) {
        next(error);
    }
};

export const getUsageSummary = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const summary = await imageObservabilityService.getImageUsageSummary(userId);
        res.json({ summary });
    } catch (error) {
        next(error);
    }
};

export const getImageById = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const image = await Image.findOne({ _id: req.params.imageId, userId }).lean();
        if (!image) return res.status(404).json({ message: 'Image not found' });
        res.json({ image });
    } catch (error) {
        next(error);
    }
};
