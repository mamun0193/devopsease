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

export const deleteImage = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const imageId = req.params.imageId;
        
        const image = await Image.findOne({ _id: imageId, userId });
        if (!image) return res.status(404).json({ error: 'Image not found' });
        
        if (image.attachedContainerIds && image.attachedContainerIds.length > 0) {
            return res.status(400).json({ error: 'Cannot delete image that is actively used by containers' });
        }

        const originalStatus = image.imageUsageStatus;
        await Image.updateOne({ _id: image._id }, { $set: { imageUsageStatus: 'PENDING_DELETE' } });

        try {
            // Import docker locally since it's not at top of file
            const docker = (await import('../docker/client.js')).default;
            if (originalStatus !== 'DANGLING') {
                await docker.getImage(image.dockerImageId).remove({ force: false });
            }
            await Image.deleteOne({ _id: image._id });
            res.json({ message: 'Image deleted successfully' });
        } catch (err) {
            await Image.updateOne({ _id: image._id }, { $set: { imageUsageStatus: originalStatus } });
            return res.status(500).json({ error: `Failed to remove from Docker: ${err.message}` });
        }
    } catch (error) {
        next(error);
    }
};
