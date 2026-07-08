import Image from '../models/image.js';
import imageObservabilityService from '../services/imageObservability.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { standardResponse } from '../utils/apiResponse.js';
import AppError, { NotFoundError, ValidationError } from '../utils/AppError.js';

export const listImages = asyncHandler(async (req, res) => {
        const userId = req.user._id;
        const images = await Image.find({ userId })
            .select('tag sizeMB layerCount imageUsageStatus attachedContainerIds lastUsedAt pullCount pulledFrom dockerImageId createdAt')
            .sort({ createdAt: -1 })
            .lean();
        res.json(standardResponse({ images }));
});

export const getUsageSummary = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const summary = await imageObservabilityService.getImageUsageSummary(userId);
    res.json(standardResponse({ summary }));
});

export const getImageById = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const image = await Image.findOne({ _id: req.params.imageId, userId }).lean();
    if (!image) throw new NotFoundError('Image not found');
    res.json(standardResponse({ image }));
});

export const deleteImage = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const imageId = req.params.imageId;
    
    const image = await Image.findOne({ _id: imageId, userId });
    if (!image) throw new NotFoundError('Image not found');
    
    if (image.attachedContainerIds && image.attachedContainerIds.length > 0) {
        throw new ValidationError('Cannot delete image that is actively used by containers');
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
        res.json(standardResponse(null, 'Image deleted successfully'));
    } catch (err) {
        await Image.updateOne({ _id: image._id }, { $set: { imageUsageStatus: originalStatus } });
        throw new AppError(`Failed to remove from Docker: ${err.message}`, 500);
    }
});
