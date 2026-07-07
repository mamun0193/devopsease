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
import logger from '../utils/logger.js';

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

class RestorePlanner {
    
    /**
     * @returns {Promise<{ plan: Object, backupData: Object }>}
     */
    async generatePlan(backupManifestId) {
        logger.info(`[RestorePlanner] Generating restore plan for backup ${backupManifestId}`);
        const manifest = await BackupManifest.findById(backupManifestId);
        if (!manifest) throw new Error('Backup Manifest not found');

        // 1. Fetch & parse artifact
        const jsonPayload = await storageService.read(manifest.storageMetadata.key);
        if (!jsonPayload) throw new Error('Backup artifact missing from storage');

        // 2. Validate Checksum
        const checksum = crypto.createHash('sha256').update(jsonPayload).digest('hex');
        if (checksum !== manifest.checksum) {
            throw new Error(`Checksum mismatch. Expected ${manifest.checksum}, got ${checksum}. Backup may be corrupted.`);
        }

        const backupData = JSON.parse(jsonPayload);
        
        // 3. Schema & Version Validation
        if (backupData.version !== manifest.schemaVersion) {
            logger.warn(`[RestorePlanner] Schema version mismatch: manifest ${manifest.schemaVersion}, artifact ${backupData.version}`);
        }

        const plan = {
            collections: {},
            totals: { inserted: 0, updated: 0, deleted: 0 }
        };

        // 4. Generate Diff per collection
        for (const [modelName, Model] of Object.entries(BACKUP_MODELS)) {
            const backedUpDocs = backupData.collections[modelName] || [];
            
            // Verify counts match manifest
            const expectedCount = manifest.collectionMetadata.get(modelName) || 0;
            if (backedUpDocs.length !== expectedCount) {
                throw new Error(`Integrity check failed for ${modelName}: Expected ${expectedCount} documents, found ${backedUpDocs.length}.`);
            }

            const currentDocs = await Model.find({}).lean();
            
            const currentMap = new Map(currentDocs.map(d => [d._id.toString(), d]));
            const backupMap = new Map(backedUpDocs.map(d => [d._id.toString(), d]));

            const inserts = [];
            const updates = [];
            const deletes = [];

            // Find Inserts and Updates (from Backup's perspective)
            for (const [id, backupDoc] of backupMap.entries()) {
                if (!currentMap.has(id)) {
                    inserts.push(backupDoc);
                } else {
                    // Check if modified (using a simple stringify comparison for now)
                    // ponytail: Fast JSON compare. ObjectId stringification might differ, but works for most props.
                    const currStr = JSON.stringify(currentMap.get(id));
                    const backStr = JSON.stringify(backupDoc);
                    if (currStr !== backStr) {
                        updates.push(backupDoc);
                    }
                }
            }

            // Find Deletes (exists in Current, missing in Backup)
            for (const [id, currentDoc] of currentMap.entries()) {
                if (!backupMap.has(id)) {
                    deletes.push(id);
                }
            }

            plan.collections[modelName] = {
                inserts: inserts.length,
                updates: updates.length,
                deletes: deletes.length
            };

            plan.totals.inserted += inserts.length;
            plan.totals.updated += updates.length;
            plan.totals.deleted += deletes.length;
        }

        logger.info(`[RestorePlanner] Plan generated: ${plan.totals.inserted} inserts, ${plan.totals.updated} updates, ${plan.totals.deleted} deletes across ${Object.keys(plan.collections).length} collections.`);
        
        return { plan, backupData };
    }
}

export default new RestorePlanner();
