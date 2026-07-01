import docker from '../docker/client.js';
import Image from '../models/image.js';
import User from '../models/User.js';
import logger from '../utils/logger.js';

class ImageRegistrationService {
    async ensureImageRegistered({ userId, imageName }) {
        const inspectData = await docker.getImage(imageName).inspect();

        const dockerImageId = inspectData.Id;
        const { extractImageMetadata } = await import('./imageMetadata.service.js');
        const { recordImageEvent } = await import('./imageLifecycle.service.js');
        
        let metadata;
        try {
            metadata = await extractImageMetadata(dockerImageId);
        } catch (err) {
            logger.warn(`Failed to extract rich metadata for pulled image ${imageName}`, { err: err.message });
            metadata = {
                sizeMB: Math.round(((inspectData.Size || inspectData.VirtualSize || 0) / (1024 * 1024)) * 100) / 100,
                layerCount: inspectData.RootFS?.Layers?.length || 0,
            };
        }

        const sizeMB = metadata.sizeMB;
        const layerCount = metadata.layerCount;

        // Check if this exact image (by dockerImageId) already registered for user
        const existing = await Image.findOne({ userId, dockerImageId });

        if (existing) {
            existing.imageUsageStatus = 'ACTIVE';
            existing.lifecycleStatus = 'READY';
            existing.pullCount = (existing.pullCount || 0) + 1;
            existing.lastUsedAt = new Date();
            
            // Enrich with metadata if missing
            if (!existing.architecture) {
                Object.assign(existing, metadata);
            }
            await existing.save();
            
            await recordImageEvent(existing._id, userId, 'Pulled', { tag: imageName });

            logger.info('Registry image already registered, updated usage', {
                userId: userId.toString(),
                tag: imageName,
                dockerImageId: dockerImageId.substring(0, 16)
            });

            return existing;
        }

        // Check if same tag exists for user (different dockerImageId = updated image)
        const byTag = await Image.findOne({ userId, tag: imageName });

        if (byTag) {
            // Tag exists but different dockerImageId — update in place
            const oldSizeMB = byTag.sizeMB || 0;
            byTag.dockerImageId = dockerImageId;
            Object.assign(byTag, metadata);
            
            byTag.imageUsageStatus = 'ACTIVE';
            byTag.lifecycleStatus = 'READY';
            byTag.pullCount = (byTag.pullCount || 0) + 1;
            byTag.lastUsedAt = new Date();
            await byTag.save();
            
            await recordImageEvent(byTag._id, userId, 'Pulled', { tag: imageName });

            // Adjust storage delta
            const delta = sizeMB - oldSizeMB;
            if (delta !== 0) {
                await User.findByIdAndUpdate(userId, { $inc: { storageUsedMB: delta } });
            }

            logger.info('Registry image tag updated', {
                userId: userId.toString(),
                tag: imageName,
                delta
            });

            return byTag;
        }

        // New registration
        const imageRecord = await Image.create({
            userId,
            tag: imageName,
            dockerImageId,
            ...metadata,
            pulledFrom: 'REGISTRY',
            imageUsageStatus: 'ACTIVE',
            lifecycleStatus: 'READY',
            pullCount: 1,
            lastUsedAt: new Date()
        });
        
        await recordImageEvent(imageRecord._id, userId, 'Pulled', { tag: imageName });

        // Increment user storage
        await User.findByIdAndUpdate(userId, { $inc: { storageUsedMB: sizeMB } });

        logger.info('Registry image registered', {
            userId: userId.toString(),
            tag: imageName,
            sizeMB,
            dockerImageId: dockerImageId.substring(0, 16)
        });

        return imageRecord;
    }
}

export default new ImageRegistrationService();
