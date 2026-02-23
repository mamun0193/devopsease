import docker from '../docker/client.js';
import Volume from '../models/volume.model.js';
import logger from '../utils/logger.js';

const MAX_SLUG_LENGTH = 48;

function slugify(str) {
    return String(str)
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '_')
        .substring(0, MAX_SLUG_LENGTH);
}

// Build namespaced Docker volume name: vol_<userId>_<projectSlug>_<volumeName>
function buildDockerVolumeName(userId, projectName, volumeName) {
    const projectSlug = slugify(projectName);
    const volSlug = slugify(volumeName);
    return `vol_${userId}_${projectSlug}_${volSlug}`;
}

class VolumeService {

    // Create or return an existing governed volume.
    // Uses DB-first atomic reservation (unique index) to prevent TOCTOU.
    async ensureVolumeExists({ userId, projectId = null, projectName, volumeName }) {
        const dockerVolumeName = buildDockerVolumeName(userId.toString(), projectName, volumeName);

        // Check if already exists for this user
        const existing = await Volume.findOne({ userId, dockerVolumeName });
        if (existing) {
            // Volume already tracked — ensure it's ACTIVE
            if (existing.usageStatus !== 'ACTIVE') {
                existing.usageStatus = 'ACTIVE';
                existing.lastUsedAt = new Date();
                await existing.save();
            }
            return existing;
        }

        // Atomic DB reservation via unique index
        let volumeDoc;
        try {
            volumeDoc = await Volume.create({
                userId,
                name: volumeName,
                dockerVolumeName,
                driver: 'local',
                projectId,
                sizeMB: 0,
                attachedContainerIds: [],
                usageStatus: 'ACTIVE',
                lastUsedAt: new Date()
            });
        } catch (err) {
            if (err.code === 11000) {
                // Race condition: another request created it — fetch and return
                const raced = await Volume.findOne({ userId, dockerVolumeName });
                if (raced) return raced;
            }
            throw Object.assign(
                new Error(`Failed to reserve volume record: ${err.message}`),
                { statusCode: 500 }
            );
        }

        // DB slot reserved — create Docker volume
        try {
            await docker.createVolume({
                Name: dockerVolumeName,
                Driver: 'local',
                Labels: {
                    'devopsease.userId': userId.toString(),
                    'devopsease.projectName': projectName,
                    'devopsease.volumeName': volumeName,
                    'devopsease.managed': 'true'
                }
            });
        } catch (err) {
            // Docker volume may already exist (idempotent for named volumes)
            if (!err.message?.includes('already exists')) {
                await Volume.deleteOne({ _id: volumeDoc._id }).catch(() => { });
                throw Object.assign(
                    new Error(`Failed to create Docker volume: ${err.message}`),
                    { statusCode: 500 }
                );
            }
        }

        logger.info('Volume created', {
            userId: userId.toString(),
            volumeName,
            dockerVolumeName
        });

        return volumeDoc;
    }

    // Delete a user-owned volume (Docker + DB)
    async deleteVolume({ volumeId, userId }) {
        const volumeDoc = await Volume.findOne({ _id: volumeId, userId });
        if (!volumeDoc) {
            return { deleted: true, notFound: true };
        }

        // Remove Docker volume
        try {
            const vol = docker.getVolume(volumeDoc.dockerVolumeName);
            await vol.remove();
        } catch (err) {
            if (!err.message?.includes('no such volume') && err.statusCode !== 404) {
                throw Object.assign(
                    new Error('Failed to remove Docker volume'),
                    { statusCode: 500 }
                );
            }
        }

        await Volume.deleteOne({ _id: volumeDoc._id });
        logger.info('Volume deleted', { userId: userId.toString(), dockerVolumeName: volumeDoc.dockerVolumeName });
        return { deleted: true };
    }

    // Mark project volumes as UNUSED (called on project delete)
    async markProjectVolumesUnused(projectId, userId) {
        await Volume.updateMany(
            { projectId, userId },
            { $set: { usageStatus: 'UNUSED', attachedContainerIds: [] } }
        );
    }

    // Reconcile DB records against live Docker state
    async reconcileVolumes(userId) {
        const volumes = await Volume.find({ userId });
        if (volumes.length === 0) return { reconciled: 0, updated: 0, orphaned: 0 };

        // Get system disk usage for volume sizes
        let volumeSizeMap = new Map();
        try {
            const dfData = await docker.df();
            if (dfData?.Volumes) {
                for (const v of dfData.Volumes) {
                    const sizeBytes = v.UsageData?.Size || 0;
                    const sizeMB = Math.round((sizeBytes / (1024 * 1024)) * 100) / 100;
                    volumeSizeMap.set(v.Name, sizeMB);
                }
            }
        } catch (err) {
            logger.warn('Failed to fetch Docker df for volume reconciliation', { error: err.message });
        }

        // Get running containers to find volume attachments
        let containerVolumes = new Map(); // dockerVolumeName → [containerId]
        try {
            const containers = await docker.listContainers({ all: true });
            for (const c of containers) {
                if (c.Mounts) {
                    for (const m of c.Mounts) {
                        if (m.Type === 'volume' && m.Name) {
                            if (!containerVolumes.has(m.Name)) {
                                containerVolumes.set(m.Name, []);
                            }
                            containerVolumes.get(m.Name).push(c.Id.substring(0, 12));
                        }
                    }
                }
            }
        } catch (err) {
            logger.warn('Failed to list containers for volume reconciliation', { error: err.message });
        }

        let updated = 0;
        let orphaned = 0;

        for (const volumeDoc of volumes) {
            const dockerName = volumeDoc.dockerVolumeName;

            // Check if Docker volume exists
            try {
                await docker.getVolume(dockerName).inspect();
            } catch (err) {
                if (err.statusCode === 404 || err.message?.includes('no such volume')) {
                    orphaned++;
                    if (volumeDoc.usageStatus !== 'UNUSED') {
                        volumeDoc.usageStatus = 'UNUSED';
                        volumeDoc.attachedContainerIds = [];
                        volumeDoc.sizeMB = 0;
                        await volumeDoc.save();
                        updated++;
                    }
                    continue;
                }
            }

            let changed = false;

            // Update size
            const newSize = volumeSizeMap.get(dockerName) || 0;
            if (volumeDoc.sizeMB !== newSize) {
                volumeDoc.sizeMB = newSize;
                changed = true;
            }

            // Update attached containers
            const attachedIds = containerVolumes.get(dockerName) || [];
            const newStatus = attachedIds.length > 0 ? 'ACTIVE' : 'UNUSED';

            if (JSON.stringify(volumeDoc.attachedContainerIds.sort()) !== JSON.stringify(attachedIds.sort())) {
                volumeDoc.attachedContainerIds = attachedIds;
                changed = true;
            }

            if (volumeDoc.usageStatus !== newStatus && volumeDoc.usageStatus !== 'PENDING_DELETE') {
                volumeDoc.usageStatus = newStatus;
                changed = true;
            }

            if (attachedIds.length > 0) {
                volumeDoc.lastUsedAt = new Date();
                changed = true;
            }

            if (changed) {
                await volumeDoc.save();
                updated++;
            }
        }

        logger.info('Volume reconciliation complete', {
            userId: userId.toString(),
            total: volumes.length,
            updated,
            orphaned
        });

        return { reconciled: volumes.length, updated, orphaned };
    }
}

export default new VolumeService();
