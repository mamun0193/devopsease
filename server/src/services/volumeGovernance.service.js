import Volume from '../models/volume.model.js';
import User from '../models/User.js';
import Project from '../models/project.model.js';
import docker from '../docker/client.js';
import SecurityLog from '../models/SecurityLog.js';
import logger from '../utils/logger.js';

const VOLUME_EVENTS = {
    VOLUME_PRUNE_PREVIEW: 'VOLUME_PRUNE_PREVIEW',
    VOLUME_PRUNE_EXECUTED: 'VOLUME_PRUNE_EXECUTED',
    VOLUME_PRUNE_FAILED: 'VOLUME_PRUNE_FAILED'
};

// Per-user in-memory mutex (same pattern as imageGovernance)
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

function logVolumeEvent({ event, userId, metadata = {} }) {
    const severity = event === VOLUME_EVENTS.VOLUME_PRUNE_FAILED ? 'WARN' : 'INFO';
    SecurityLog.create({
        userId,
        action: event,
        result: severity === 'WARN' ? 'denied' : 'allowed',
        severity,
        metadata
    }).catch((err) => {
        logger.warn('Volume audit log write failed', { event, error: err.message });
    });

    const logMethod = severity === 'WARN' ? 'warn' : 'info';
    logger[logMethod](`Volume event: ${event}`, { userId: userId?.toString(), ...metadata });
}

// Get prune candidates: UNUSED volumes with no containers attached and not linked to active projects
async function getPruneCandidates(userId) {
    const volumes = await Volume.find({
        userId,
        usageStatus: 'UNUSED',
        $or: [
            { attachedContainerIds: { $size: 0 } },
            { attachedContainerIds: { $exists: false } }
        ]
    }).lean();

    if (volumes.length === 0) {
        return { candidates: [], totalReclaimableMB: 0 };
    }

    // Filter out volumes linked to active projects
    const activeProjectIds = new Set();
    const projects = await Project.find({ userId, status: { $in: ['RUNNING', 'STOPPED', 'CREATED'] } })
        .select('_id')
        .lean();
    for (const p of projects) {
        activeProjectIds.add(p._id.toString());
    }

    const candidates = [];
    let totalReclaimableMB = 0;

    for (const vol of volumes) {
        if (vol.projectId && activeProjectIds.has(vol.projectId.toString())) {
            continue;
        }

        candidates.push({
            id: vol._id,
            name: vol.name,
            dockerVolumeName: vol.dockerVolumeName,
            sizeMB: vol.sizeMB,
            usageStatus: vol.usageStatus,
            lastUsedAt: vol.lastUsedAt,
            createdAt: vol.createdAt
        });
        totalReclaimableMB += vol.sizeMB;
    }

    logVolumeEvent({
        event: VOLUME_EVENTS.VOLUME_PRUNE_PREVIEW,
        userId,
        metadata: { candidateCount: candidates.length, totalReclaimableMB: Math.round(totalReclaimableMB * 100) / 100 }
    });

    return {
        candidates,
        totalReclaimableMB: Math.round(totalReclaimableMB * 100) / 100
    };
}

// Execute safe prune with per-user lock, rollback-on-failure, and audit
async function executeSafePrune(userId) {
    const release = await acquireLock(userId);

    try {
        // Recalculate candidates server-side (never trust stale data)
        const { candidates } = await getPruneCandidates(userId);

        if (candidates.length === 0) {
            return { reclaimedMB: 0, deletedCount: 0, errors: [] };
        }

        let reclaimedMB = 0;
        let deletedCount = 0;
        const errors = [];

        for (const candidate of candidates) {
            // Revalidate: fetch fresh doc, ensure still UNUSED and no containers attached
            const volumeDoc = await Volume.findOne({ _id: candidate.id, userId });
            if (!volumeDoc) continue;
            if (volumeDoc.usageStatus !== 'UNUSED') continue;
            if (volumeDoc.attachedContainerIds.length > 0) continue;

            // Mark PENDING_DELETE before attempting Docker removal
            const previousStatus = volumeDoc.usageStatus;
            volumeDoc.usageStatus = 'PENDING_DELETE';
            await volumeDoc.save();

            try {
                const vol = docker.getVolume(volumeDoc.dockerVolumeName);
                await vol.remove();

                // Docker removal succeeded — delete DB record
                await Volume.deleteOne({ _id: volumeDoc._id });
                reclaimedMB += volumeDoc.sizeMB;
                deletedCount++;
            } catch (err) {
                // Rollback: restore previous status
                await Volume.updateOne(
                    { _id: volumeDoc._id },
                    { $set: { usageStatus: previousStatus } }
                );

                const errorDetail = {
                    volumeId: volumeDoc._id.toString(),
                    dockerVolumeName: volumeDoc.dockerVolumeName,
                    error: err.message
                };
                errors.push(errorDetail);

                logVolumeEvent({
                    event: VOLUME_EVENTS.VOLUME_PRUNE_FAILED,
                    userId,
                    metadata: errorDetail
                });
            }
        }

        reclaimedMB = Math.round(reclaimedMB * 100) / 100;

        // Update user storageUsedMB
        if (reclaimedMB > 0) {
            await User.findByIdAndUpdate(userId, { $inc: { storageUsedMB: -reclaimedMB } });
        }

        logVolumeEvent({
            event: VOLUME_EVENTS.VOLUME_PRUNE_EXECUTED,
            userId,
            metadata: { deletedCount, reclaimedMB, errorCount: errors.length }
        });

        return { reclaimedMB, deletedCount, errors };
    } finally {
        release();
    }
}

export default {
    getPruneCandidates,
    executeSafePrune
};
