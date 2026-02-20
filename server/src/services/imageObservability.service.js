import Image from '../models/image.js';
import docker from '../docker/client.js';
import logger from '../utils/logger.js';

let reconciling = false;

async function reconcileImageUsage() {
    if (reconciling) return;
    reconciling = true;

    try {
        const allImages = await Image.find({}).lean();
        if (allImages.length === 0) {
            reconciling = false;
            return;
        }

        let containers = [];
        try {
            containers = await docker.listContainers({ all: true });
        } catch (err) {
            logger.warn('reconcileImageUsage: Docker unavailable', { error: err.message });
            reconciling = false;
            return;
        }

        const imageToContainers = new Map();
        for (const c of containers) {
            const imgId = c.ImageID;
            if (!imgId) continue;
            const shortId = imgId.replace('sha256:', '');
            if (!imageToContainers.has(shortId)) {
                imageToContainers.set(shortId, []);
            }
            imageToContainers.get(shortId).push(c.Id);

            const fullId = imgId;
            if (!imageToContainers.has(fullId)) {
                imageToContainers.set(fullId, []);
            }
            imageToContainers.get(fullId).push(c.Id);
        }

        let dockerImageIds = new Set();
        try {
            const dockerImages = await docker.listImages({ all: true });
            for (const img of dockerImages) {
                if (img.Id) {
                    dockerImageIds.add(img.Id);
                    dockerImageIds.add(img.Id.replace('sha256:', ''));
                }
            }
        } catch (err) {
            logger.warn('reconcileImageUsage: Failed to list Docker images', { error: err.message });
        }

        const ops = [];
        for (const image of allImages) {
            const dbId = image.dockerImageId;
            const attachedIds = imageToContainers.get(dbId) || [];
            const uniqueAttached = [...new Set(attachedIds)];

            let newStatus;
            if (!dockerImageIds.has(dbId)) {
                newStatus = 'DANGLING';
            } else if (uniqueAttached.length > 0) {
                newStatus = 'ACTIVE';
            } else {
                newStatus = 'UNUSED';
            }

            const statusChanged = image.imageUsageStatus !== newStatus;
            const containersChanged = JSON.stringify(image.attachedContainerIds || []) !== JSON.stringify(uniqueAttached);

            if (statusChanged || containersChanged) {
                const update = {
                    imageUsageStatus: newStatus,
                    attachedContainerIds: uniqueAttached
                };
                if (newStatus === 'ACTIVE' && statusChanged) {
                    update.lastUsedAt = new Date();
                }
                if (image.pullCount == null) update.pullCount = 0;
                if (!image.pulledFrom) update.pulledFrom = 'DOCKERFILE';
                ops.push(Image.updateOne({ _id: image._id }, { $set: update }));
            } else {
                // Backfill missing fields on records that don't need status updates
                const backfill = {};
                if (image.pullCount == null) backfill.pullCount = 0;
                if (!image.pulledFrom) backfill.pulledFrom = 'DOCKERFILE';
                if (Object.keys(backfill).length > 0) {
                    ops.push(Image.updateOne({ _id: image._id }, { $set: backfill }));
                }
            }
        }

        if (ops.length > 0) {
            await Promise.all(ops);
            logger.info(`Image reconciliation complete: ${ops.length} image(s) updated`);
        }
    } catch (err) {
        logger.error('reconcileImageUsage failed', { error: err.message });
    } finally {
        reconciling = false;
    }
}

async function calculateUserImageUsage(userId) {
    const result = await Image.aggregate([
        { $match: { userId } },
        { $group: { _id: null, totalMB: { $sum: '$sizeMB' }, count: { $sum: 1 } } }
    ]);
    if (result.length === 0) return { totalMB: 0, count: 0 };
    return { totalMB: result[0].totalMB, count: result[0].count };
}

async function getImageUsageSummary(userId) {
    const images = await Image.find({ userId }).lean();

    let totalImageStorageMB = 0;
    let activeImages = 0;
    let unusedImages = 0;
    let danglingImages = 0;

    for (const img of images) {
        totalImageStorageMB += img.sizeMB || 0;
        if (img.imageUsageStatus === 'ACTIVE') activeImages++;
        else if (img.imageUsageStatus === 'DANGLING') danglingImages++;
        else unusedImages++;
    }

    let buildCacheMB = 0;
    try {
        const df = await docker.df();
        if (df.BuildCache) {
            let totalBytes = 0;
            for (const entry of df.BuildCache) {
                totalBytes += entry.Size || 0;
            }
            buildCacheMB = Math.round((totalBytes / (1024 * 1024)) * 100) / 100;
        }
    } catch (err) {
        logger.warn('getImageUsageSummary: docker.df() failed', { error: err.message });
    }

    return {
        totalImageStorageMB: Math.round(totalImageStorageMB * 100) / 100,
        activeImages,
        unusedImages,
        danglingImages,
        buildCacheMB
    };
}

export default {
    reconcileImageUsage,
    calculateUserImageUsage,
    getImageUsageSummary
};
