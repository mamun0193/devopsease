import Image from '../models/image.js';
import Volume from '../models/volume.model.js';
import docker from '../docker/client.js';
import logger from '../utils/logger.js';
import { logGovernanceEvent, GOVERNANCE_EVENTS } from './imageGovernance.audit.js';

const pruneLocks = new Map();

async function acquireLock(userId) {
    const key = userId.toString();
    while (pruneLocks.has(key)) {
        await pruneLocks.get(key);
    }
    let releaseLock;
    const lockPromise = new Promise((resolve) => { releaseLock = resolve; });
    pruneLocks.set(key, lockPromise);
    return () => {
        pruneLocks.delete(key);
        releaseLock();
    };
}

async function calculateAccurateUserStorage(userId) {
    const [imageResult, volumeResult] = await Promise.all([
        Image.aggregate([
            { $match: { userId } },
            { $group: { _id: null, totalMB: { $sum: '$sizeMB' }, count: { $sum: 1 } } }
        ]),
        Volume.aggregate([
            { $match: { userId } },
            { $group: { _id: null, totalMB: { $sum: '$sizeMB' }, count: { $sum: 1 } } }
        ])
    ]);

    const imageMB = imageResult.length > 0 ? imageResult[0].totalMB : 0;
    const imageCount = imageResult.length > 0 ? imageResult[0].count : 0;
    const volumeMB = volumeResult.length > 0 ? volumeResult[0].totalMB : 0;
    const volumeCount = volumeResult.length > 0 ? volumeResult[0].count : 0;

    return {
        totalMB: Math.round((imageMB + volumeMB) * 100) / 100,
        imageCount,
        volumeCount
    };
}

async function getActiveContainerImageIds() {
    try {
        const containers = await docker.listContainers({ all: true });
        const ids = new Set();
        for (const c of containers) {
            if (c.ImageID) {
                ids.add(c.ImageID);
                ids.add(c.ImageID.replace('sha256:', ''));
            }
        }
        return ids;
    } catch (err) {
        logger.warn('getActiveContainerImageIds: Docker unavailable', { error: err.message });
        return null;
    }
}

async function getPruneCandidates(userId) {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const images = await Image.find({
        userId,
        imageUsageStatus: { $in: ['UNUSED', 'DANGLING'] },
        attachedContainerIds: { $size: 0 },
        lastUsedAt: { $lte: fiveMinutesAgo }
    }).lean();

    if (images.length === 0) {
        return { candidates: [], totalReclaimableMB: 0 };
    }

    const containerImageIds = await getActiveContainerImageIds();
    if (containerImageIds === null) {
        return { candidates: [], totalReclaimableMB: 0 };
    }

    const candidates = [];
    let totalReclaimableMB = 0;

    for (const img of images) {
        if (img.imageUsageStatus !== 'DANGLING') {
            if (containerImageIds.has(img.dockerImageId)) continue;
        }

        candidates.push({
            id: img._id,
            tag: img.tag,
            sizeMB: img.sizeMB,
            dockerImageId: img.dockerImageId,
            status: img.imageUsageStatus,
            createdAt: img.createdAt
        });
        totalReclaimableMB += img.sizeMB;
    }

    return {
        candidates,
        totalReclaimableMB: Math.round(totalReclaimableMB * 100) / 100
    };
}

async function executeSafePrune(userId) {
    const release = await acquireLock(userId);

    try {
        const { candidates } = await getPruneCandidates(userId);

        if (candidates.length === 0) {
            return { reclaimedMB: 0, deletedCount: 0, errors: [] };
        }

        let reclaimedMB = 0;
        let deletedCount = 0;
        const errors = [];

        for (const candidate of candidates) {
            const image = await Image.findOne({ _id: candidate.id, userId });
            if (!image) continue;
            if (image.imageUsageStatus !== 'UNUSED' && image.imageUsageStatus !== 'DANGLING') continue;
            if (image.attachedContainerIds.length > 0) continue;

            const originalStatus = image.imageUsageStatus;

            if (originalStatus === 'UNUSED') {
                const containerImageIds = await getActiveContainerImageIds();
                if (containerImageIds && containerImageIds.has(image.dockerImageId)) {
                    continue;
                }
            }

            await Image.updateOne({ _id: image._id }, { $set: { imageUsageStatus: 'PENDING_DELETE' } });

            try {
                if (originalStatus === 'UNUSED') {
                    await docker.getImage(image.dockerImageId).remove({ force: false });
                }
                // For DANGLING, it's already gone from Docker, just delete DB record
                await Image.deleteOne({ _id: image._id });
                reclaimedMB += image.sizeMB;
                deletedCount++;
            } catch (err) {
                await Image.updateOne({ _id: image._id }, { $set: { imageUsageStatus: originalStatus } });
                const errorDetail = { imageId: image._id.toString(), tag: image.tag, error: err.message };
                errors.push(errorDetail);

                logGovernanceEvent({
                    event: GOVERNANCE_EVENTS.IMAGE_PRUNE_FAILED,
                    userId,
                    metadata: errorDetail
                });

                logger.warn('Prune failed for image', errorDetail);
            }
        }

        reclaimedMB = Math.round(reclaimedMB * 100) / 100;

        logGovernanceEvent({
            event: GOVERNANCE_EVENTS.IMAGE_PRUNE_EXECUTED,
            userId,
            metadata: { deletedCount, reclaimedMB, errorCount: errors.length }
        });

        return { reclaimedMB, deletedCount, errors };
    } finally {
        release();
    }
}

async function pruneBuildCache(userId) {
    try {
        const result = await new Promise((resolve, reject) => {
            docker.modem.dial({
                path: '/build/prune?all=1',
                method: 'POST',
                statusCodes: {
                    200: true,
                    500: 'server error'
                }
            }, (err, data) => {
                if (err) return reject(err);
                resolve(data);
            });
        });

        const reclaimedBytes = result?.SpaceReclaimed || 0;
        const reclaimedMB = Math.round((reclaimedBytes / (1024 * 1024)) * 100) / 100;

        logGovernanceEvent({
            event: GOVERNANCE_EVENTS.BUILD_CACHE_PRUNE_EXECUTED,
            userId,
            metadata: { reclaimedMB }
        });

        return { reclaimedMB };
    } catch (err) {
        logger.error('Failed to prune build cache', { error: err.message });
        throw err;
    }
}

export default {
    calculateAccurateUserStorage,
    getPruneCandidates,
    executeSafePrune,
    pruneBuildCache
};
