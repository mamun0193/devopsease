import docker from '../docker/client.js';
import Image from '../models/image.js';
import User from '../models/User.js';
import logger from '../utils/logger.js';

class ImageRegistrationService {
    async ensureImageRegistered({ userId, imageName }) {
        const inspectData = await docker.getImage(imageName).inspect();

        const dockerImageId = inspectData.Id;
        const sizeBytes = inspectData.Size || inspectData.VirtualSize || 0;
        const sizeMB = Math.round((sizeBytes / (1024 * 1024)) * 100) / 100;
        const layerCount = inspectData.RootFS?.Layers?.length || 0;

        // Check if this exact image (by dockerImageId) already registered for user
        const existing = await Image.findOne({ userId, dockerImageId });

        if (existing) {
            existing.imageUsageStatus = 'ACTIVE';
            existing.pullCount = (existing.pullCount || 0) + 1;
            existing.lastUsedAt = new Date();
            await existing.save();

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
            byTag.sizeMB = sizeMB;
            byTag.layerCount = layerCount;
            byTag.imageUsageStatus = 'ACTIVE';
            byTag.pullCount = (byTag.pullCount || 0) + 1;
            byTag.lastUsedAt = new Date();
            await byTag.save();

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
            sizeMB,
            layerCount,
            pulledFrom: 'REGISTRY',
            imageUsageStatus: 'ACTIVE',
            pullCount: 1,
            lastUsedAt: new Date()
        });

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
