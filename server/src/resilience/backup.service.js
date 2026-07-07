import crypto from 'crypto';
import Application from '../models/application.model.js';
import Cluster from '../models/cluster.model.js';
import ConfigEntry from '../models/configEntry.model.js';
import Domain from '../models/domain.model.js';
import Env from '../models/env.model.js';
import Network from '../models/network.model.js';
import Project from '../models/project.model.js';
import Quota from '../models/quota.model.js';
import RoutingTable from '../models/routingTable.model.js';
import ScalingPolicy from '../models/scalingPolicy.model.js';
import TrafficPolicy from '../models/trafficPolicy.model.js';
import User from '../models/User.js';
import Volume from '../models/volume.model.js';
import BackupManifest from '../models/backupManifest.model.js';
import { storageService } from '../storage/storage.service.js';
import platformEventBus, { DOMAINS, SEVERITIES } from '../events/platformEventBus.js';
import logger from '../utils/logger.js';

// ponytail: Backup only critical platform configuration metadata.
// Do not backup ephemeral runtime state (metrics, container statuses) or heavy artifacts.
const BACKUP_MODELS = {
    Application,
    Cluster,
    ConfigEntry,
    Domain,
    Env,
    Network,
    Project,
    Quota,
    RoutingTable,
    ScalingPolicy,
    TrafficPolicy,
    User,
    Volume,
};

class BackupService {
    async runDailyBackup() {
        return this.createBackup('daily');
    }

    async createBackup(tier = 'daily') {
        const backupStart = Date.now();
        const collectionMetadata = {};
        const backupData = {
            version: '1.0',
            timestamp: new Date().toISOString(),
            collections: {}
        };

        try {
            logger.info(`[BackupService] Starting ${tier} backup...`);

            for (const [modelName, Model] of Object.entries(BACKUP_MODELS)) {
                // Lean queries for fast serialization
                const docs = await Model.find({}).lean();
                backupData.collections[modelName] = docs;
                collectionMetadata[modelName] = docs.length;
            }

            const jsonPayload = JSON.stringify(backupData);
            const checksum = crypto.createHash('sha256').update(jsonPayload).digest('hex');
            const sizeBytes = Buffer.byteLength(jsonPayload, 'utf8');

            const timestampStr = new Date().toISOString().replace(/[:.]/g, '-');
            const storageKey = `backups/backup-${tier}-${timestampStr}.json`;

            await storageService.write(storageKey, jsonPayload);

            // Calculate expiration
            let expiresAt = null;
            const now = new Date();
            if (tier === 'daily') {
                expiresAt = new Date(now.setDate(now.getDate() + 7)); // Keep dailies for 7 days
            } else if (tier === 'weekly') {
                expiresAt = new Date(now.setDate(now.getDate() + 30)); // Keep weeklies for 30 days
            } else if (tier === 'monthly') {
                expiresAt = new Date(now.setMonth(now.getMonth() + 12)); // Keep monthlies for a year
            } // 'pinned' has expiresAt = null

            const manifest = await BackupManifest.create({
                checksum,
                storageMetadata: {
                    driver: storageService.getDriverName(),
                    key: storageKey,
                    sizeBytes,
                },
                collectionMetadata,
                retentionTier: tier,
                status: 'SUCCESS',
                expiresAt,
            });

            platformEventBus.publish(DOMAINS.RECOVERY, 'BACKUP_COMPLETED', {
                severity: SEVERITIES.INFO,
                resourceType: 'BackupManifest',
                resourceId: manifest._id,
                payload: {
                    sizeBytes,
                    tier,
                    durationMs: Date.now() - backupStart,
                    reason: `Successfully created ${tier} backup`
                }
            });

            logger.info(`[BackupService] Backup ${manifest._id} created successfully.`);
            return manifest;

        } catch (error) {
            logger.error(`[BackupService] Backup failed: ${error.message}`);
            platformEventBus.publish(DOMAINS.RECOVERY, 'BACKUP_FAILED', {
                severity: SEVERITIES.CRITICAL,
                payload: {
                    error: error.message,
                    reason: 'Failed to create platform backup'
                }
            });
            throw error;
        }
    }

    async runRetentionCleanup() {
        logger.info(`[BackupService] Running retention cleanup...`);
        try {
            const expiredBackups = await BackupManifest.find({
                expiresAt: { $lt: new Date() },
                status: 'SUCCESS'
            });

            for (const backup of expiredBackups) {
                logger.info(`[BackupService] Deleting expired backup ${backup._id}`);
                
                try {
                    await storageService.delete(backup.storageMetadata.key);
                } catch (e) {
                    logger.warn(`[BackupService] Failed to delete backup artifact from storage: ${backup.storageMetadata.key}`, { error: e.message });
                }

                await BackupManifest.deleteOne({ _id: backup._id });

                platformEventBus.publish(DOMAINS.RECOVERY, 'BACKUP_DELETED', {
                    severity: SEVERITIES.INFO,
                    resourceType: 'BackupManifest',
                    resourceId: backup._id,
                    payload: {
                        reason: `Expired backup deleted automatically by retention policy`
                    }
                });
            }
            logger.info(`[BackupService] Retention cleanup finished. Removed ${expiredBackups.length} backups.`);
        } catch (error) {
            logger.error(`[BackupService] Retention cleanup failed: ${error.message}`);
        }
    }
}

export default new BackupService();
