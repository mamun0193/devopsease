import Image from '../models/image.js';
import ImageHistory from '../models/imageHistory.model.js';
import logger from '../utils/logger.js';

/**
 * Transitions an image to a new lifecycle state and optionally records a history event.
 * @param {string} imageId 
 * @param {string} newStatus 
 * @param {string} eventName (Optional) Event to log in history
 * @param {Object} metadata (Optional) Additional context for the event
 * @returns {Promise<Object>} The updated image
 */
export async function transitionImageStatus(imageId, newStatus, eventName = null, metadata = {}) {
    const image = await Image.findById(imageId);
    if (!image) {
        throw new Error(`Image ${imageId} not found for lifecycle transition`);
    }

    const oldStatus = image.lifecycleStatus;
    image.lifecycleStatus = newStatus;

    // Backward compatibility updates based on new state
    if (newStatus === 'DEPLOYED') {
        image.imageUsageStatus = 'ACTIVE';
        image.lastUsedAt = new Date();
    } else if (newStatus === 'DELETED' || newStatus === 'ARCHIVED') {
        // Keeps it logically separated
    }

    await image.save();

    if (eventName) {
        await recordImageEvent(imageId, image.userId, eventName, {
            ...metadata,
            transition: `${oldStatus} -> ${newStatus}`
        });
    }

    return image;
}

/**
 * Records an event in the Image History timeline
 * @param {string} imageId 
 * @param {string} userId 
 * @param {string} event 
 * @param {Object} metadata 
 */
export async function recordImageEvent(imageId, userId, event, metadata = {}) {
    try {
        await ImageHistory.create({
            imageId,
            userId,
            event,
            metadata
        });
    } catch (err) {
        logger.error(`Failed to record image history event ${event} for ${imageId}`, { error: err.message });
    }
}

/**
 * Updates Docker Hub Push metadata on an image
 */
export async function markAsPushed(imageId, repository, tag, digest) {
    const image = await Image.findById(imageId);
    if (!image) throw new Error('Image not found');

    image.registry = {
        provider: 'DOCKERHUB',
        repository,
        pushedTag: tag,
        pushedDigest: digest,
        pushTimestamp: new Date(),
        url: `https://hub.docker.com/r/${repository}`
    };

    image.lifecycleStatus = 'PUSHED';
    await image.save();

    await recordImageEvent(imageId, image.userId, 'Pushed to Docker Hub', {
        repository,
        tag,
        digest
    });

    return image;
}

export default {
    transitionImageStatus,
    recordImageEvent,
    markAsPushed
};
