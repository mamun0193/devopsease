import ConfigEntry from '../models/configEntry.model.js';
import ConfigSnapshot, { hashValue } from '../models/configSnapshot.model.js';
import { decrypt } from '../utils/encryption.js';
import logger from '../utils/logger.js';

/**
 * ConfigSnapshot Service
 *
 * Creates and queries immutable configuration snapshots per deployment.
 * Each snapshot captures the exact version and value hash of every
 * ConfigEntry at deployment time.
 */

// Get the configuration snapshot for a specific deployment.

export async function getSnapshotByDeployment(deploymentId) {
    return ConfigSnapshot.findOne({ deploymentId }).lean();
}

// Compare two deployment snapshots and return a diff.

export async function compareSnapshots(deploymentId1, deploymentId2) {
    const [snap1, snap2] = await Promise.all([
        ConfigSnapshot.findOne({ deploymentId: deploymentId1 }).lean(),
        ConfigSnapshot.findOne({ deploymentId: deploymentId2 }).lean(),
    ]);

    if (!snap1 || !snap2) {
        const missing = !snap1 ? deploymentId1 : deploymentId2;
        throw Object.assign(
            new Error(`Snapshot not found for deployment ${missing}`),
            { statusCode: 404, errorCode: 'SNAPSHOT_NOT_FOUND' },
        );
    }

    const map1 = Object.fromEntries(snap1.entries.map(e => [e.name, e]));
    const map2 = Object.fromEntries(snap2.entries.map(e => [e.name, e]));

    const allKeys = new Set([...Object.keys(map1), ...Object.keys(map2)]);

    const added = [];
    const removed = [];
    const changed = [];
    const unchanged = [];

    for (const key of allKeys) {
        const e1 = map1[key];
        const e2 = map2[key];

        if (!e1 && e2) {
            added.push({ name: key, type: e2.type, version: e2.version });
        } else if (e1 && !e2) {
            removed.push({ name: key, type: e1.type, version: e1.version });
        } else if (e1.valueHash !== e2.valueHash || e1.version !== e2.version) {
            changed.push({
                name: key,
                type: e2.type,
                fromVersion: e1.version,
                toVersion: e2.version,
                valueChanged: e1.valueHash !== e2.valueHash,
            });
        } else {
            unchanged.push({ name: key, type: e1.type, version: e1.version });
        }
    }

    return {
        from: { deploymentId: deploymentId1, generatedAt: snap1.generatedAt },
        to: { deploymentId: deploymentId2, generatedAt: snap2.generatedAt },
        added,
        removed,
        changed,
        unchanged,
        summary: {
            totalFrom: snap1.entries.length,
            totalTo: snap2.entries.length,
            addedCount: added.length,
            removedCount: removed.length,
            changedCount: changed.length,
            unchangedCount: unchanged.length,
        },
    };
}

export default {
    getSnapshotByDeployment,
    compareSnapshots,
};
