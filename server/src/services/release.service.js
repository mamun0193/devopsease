import Release, { RELEASE_STATUSES } from '../models/release.model.js';
import ReleaseManifest from '../models/releaseManifest.model.js';
import releaseEvents from '../events/release.events.js';
import logger from '../utils/logger.js';

class ReleaseService {
    /**
     * Create a new Release from an existing Deployment and ConfigSnapshot
     */
    async createDraftRelease(applicationId, userId, configSnapshotId, repositoryId, buildManifestId, imageId, environmentId, strategyParameters = {}) {
        const manifest = await ReleaseManifest.create({
            applicationId,
            userId,
            repositoryId,
            configSnapshotId,
            buildManifestId,
            imageId,
            environmentId,
            strategyParameters
        });

        // Determine version (e.g. v1, v2)
        const count = await Release.countDocuments({ applicationId });
        const version = `v${count + 1}`;

        const release = await Release.create({
            applicationId,
            manifestId: manifest._id,
            version,
            status: 'Draft',
            explainabilityLog: [{
                decision: 'RELEASE_CREATED',
                trigger: 'USER_COMMAND',
                actor: String(userId),
                reason: `Release ${version} created as Draft.`
            }]
        });

        logger.info(`Draft Release created`, { releaseId: release._id, version });
        releaseEvents.emitDomainEvent('RELEASE_CREATED', { version, applicationId }, 'Release', release._id);

        return release;
    }

    /**
     * Advance a release state
     */
    async transitionState(releaseId, newState, reason, source = 'Platform') {
        const release = await Release.findById(releaseId);
        if (!release) throw new Error('Release not found');

        const oldState = release.status;

        // Basic validation of transition logic could be expanded here.
        if (oldState === newState) return release;
        
        if (oldState === 'Archived' || oldState === 'RolledBack') {
            throw new Error(`Cannot transition from terminal state ${oldState}`);
        }

        release.status = newState;
        release.explainabilityLog.push({
            decision: `TRANSITION_TO_${newState.toUpperCase()}`,
            trigger: 'PLATFORM_WORKFLOW',
            actor: source,
            reason: reason || `Transitioned from ${oldState} to ${newState}`,
            relatedResource: null
        });

        await release.save();

        logger.info(`Release transitioned`, { releaseId, oldState, newState });
        releaseEvents.emitDomainEvent(`RELEASE_${newState.toUpperCase()}`, { applicationId: release.applicationId, version: release.version, oldState }, 'Release', release._id);

        return release;
    }

    /**
     * Link a Deployment to a Release Target
     */
    async addReleaseTarget(releaseId, targetName, deploymentId) {
        const release = await Release.findById(releaseId);
        if (!release) throw new Error('Release not found');

        release.targets.push({
            name: targetName,
            deploymentId,
            status: 'pending'
        });

        release.explainabilityLog.push({
            decision: 'TARGET_BOUND',
            trigger: 'DEPLOYMENT_STARTED',
            actor: 'Platform',
            reason: `Target ${targetName} bound to Deployment ${deploymentId}`,
            relatedResource: { type: 'Deployment', id: String(deploymentId) }
        });

        await release.save();
        return release;
    }

    /**
     * Set target status (e.g. when deployment completes)
     */
    async updateTargetStatus(releaseId, targetName, status) {
        const release = await Release.findById(releaseId);
        if (!release) return;

        const target = release.targets.find(t => t.name === targetName);
        if (target) {
            target.status = status;
            await release.save();
        }
    }
}

export default new ReleaseService();
