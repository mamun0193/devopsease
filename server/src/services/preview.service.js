import Preview from '../models/preview.model.js';
import PreviewEvent from '../models/previewEvent.model.js';
import BuildManifest from '../models/buildManifest.model.js';
import Build from '../models/build.model.js';
import ConfigSnapshot from '../models/configSnapshot.model.js';
import RoutingTable from '../models/routingTable.model.js';
import Repository from '../models/repository.model.js';
import { deployFromBuild, removeDeployment } from './deployment.service.js';
import releaseEvents from '../events/release.events.js';
import gatewayEvents from '../gateway/gateway.events.js';
import { RESOURCE_TYPES } from '../resources/resourceTypes.js';
import resourceService from '../resources/resource.service.js';
import quotaService from './quota.service.js';
import previewPolicyService from './previewPolicy.service.js';
import { canTransition, validateTransition } from '../system/previewLifecycle.js';
import urlResolver from '../system/urlResolver.js';
import logger from '../utils/logger.js';
import AppError from '../utils/AppError.js';
import crypto from 'crypto';

class PreviewLifecycleError extends AppError {
    constructor(message) {
        super(message, 400);
        this.name = 'PreviewLifecycleError';
    }
}

class PreviewService {

    async createPreview(userId, repositoryId, options = {}) {
        const { branch, commitSha, prNumber, prTitle, trigger, buildFingerprint, forceBuild = false } = options;

        const repo = await Repository.findById(repositoryId);
        if (!repo) throw new AppError('Repository not found', 404);

        const policy = await previewPolicyService.getPolicy(repositoryId, userId);

        // 1. Quota checks
        await quotaService.checkPreviewCount(userId, policy.maxPreviews);

        // 2. Resolve ConfigSnapshot (latest for this repo)
        const configSnapshot = await ConfigSnapshot.findOne({ repositoryId })
            .sort({ generatedAt: -1 }).lean();

        // 3. Artifact Reuse
        let buildId = null;
        let imageId = null;

        if (buildFingerprint && !forceBuild) {
            const existingManifest = await BuildManifest.findOne({
                repoId: repositoryId,
                buildFingerprint
            }).sort({ createdAt: -1 }).lean();

            if (existingManifest) {
                const build = await Build.findOne({ manifestId: existingManifest._id }).lean();
                if (build) {
                    buildId = build._id;
                    imageId = existingManifest.imageId;
                }
            }
        }

        if (!buildId) {
             throw new AppError('Build missing or could not be reused. Trigger a build first.', 400);
        }

        // 4. Resolve Manifest Fields
        const manifest = {
            branch,
            commitSha,
            prNumber: prNumber || null,
            prTitle: prTitle || null,
            trigger: trigger || 'API',
            buildId,
            imageId,
            configSnapshotId: configSnapshot ? configSnapshot._id : null,
            policySnapshotId: policy._id || null,
            resourceLimits: {
                cpuLimit: policy.cpuLimit,
                memoryLimit: policy.memoryLimit
            }
        };

        // 5. Allocate slug
        const shortHash = crypto.randomBytes(4).toString('hex');
        const sanitizedRepoName = repo.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
        const slug = `prev-${sanitizedRepoName}-${shortHash}`;

        // 6. Create Preview record
        const expiresAt = new Date(Date.now() + (policy.ttlMinutes * 60 * 1000));
        const preview = await Preview.create({
            userId,
            repositoryId,
            applicationId: repo.applicationId || repo._id,
            manifest,
            slug,
            expiresAt,
            status: 'creating'
        });

        await quotaService.incrementPreviewCount(userId);
        await resourceService.registerResource({
            resourceId: String(preview._id),
            type: RESOURCE_TYPES.PREVIEW,
            ownerId: userId,
            metadata: { slug, branch }
        });

        // Record event
        await this._recordEvent(preview._id, userId, 'PREVIEW_CREATED', trigger, userId, 'Preview created');
        
        // Emit domain event
        releaseEvents.emitDomainEvent('PREVIEW_CREATED', {
            previewId: preview._id,
            slug,
            repositoryId,
            branch,
            commitSha,
            trigger
        }, 'Preview', preview._id);

        // Async spawn deployment
        this._deployPreviewTarget(preview, manifest, buildId).catch(err => {
            logger.error(`Preview deployment failed for ${preview._id}: ${err.message}`);
            this._safeTransition(preview._id, 'failed', 'PREVIEW_FAILED', 'PLATFORM', 'Platform', `Deployment failed: ${err.message}`);
        });

        return preview;
    }

    async _deployPreviewTarget(preview, manifest, buildId) {
        // Transition to preparing
        await this._safeTransition(preview._id, 'preparing', 'PREVIEW_PREPARING', 'PLATFORM', 'Platform', 'Resolving artifacts');

        const build = await Build.findById(buildId);
        if (!build) throw new Error('Build not found during deployment');

        // Transition to deploying
        await this._safeTransition(preview._id, 'deploying', 'PREVIEW_DEPLOYING', 'PLATFORM', 'Platform', 'Creating containers');

        // Delegate to existing deployment service
        const deployment = await deployFromBuild(build, { replicas: 1 });
        
        // Inject previewId for websocket broadcasting
        deployment._previewId = preview._id;
        await deployment.save();

        // Check race condition (preview destroyed while deploying)
        const currentPreview = await Preview.findById(preview._id);
        if (!currentPreview || currentPreview.status === 'destroyed' || currentPreview.status === 'destroying') {
            await removeDeployment(deployment._id);
            logger.warn(`Aborted preview deployment for ${preview._id}: Preview was destroyed during deployment.`);
            await this._recordEvent(preview._id, currentPreview?.userId || null, 'DEPLOYMENT_ABORTED', 'PLATFORM', 'Platform', 'Preview was destroyed during deployment');
            return;
        }

        preview.targets.push({
            name: 'primary',
            deploymentId: deployment._id,
            status: 'ready',
            url: urlResolver.previewUrl(preview.slug),
            port: deployment.port,
            containerId: deployment.containerId
        });

        // Update Routing Table
        await this._updateRoutingTable(preview, deployment);

        preview.readyAt = new Date();
        preview.status = 'ready';
        await preview.save();
        await this._recordEvent(preview._id, preview.userId, 'PREVIEW_READY', 'PLATFORM', 'Platform', 'Preview is ready');

        releaseEvents.emitDomainEvent('PREVIEW_READY', {
            previewId: preview._id,
            slug: preview.slug,
            url: preview.targets[0].url,
            expiresAt: preview.expiresAt
        }, 'Preview', preview._id);
    }

    async _updateRoutingTable(preview, deployment) {
        const routes = [{
            deploymentId: deployment._id,
            releaseId: null,
            weight: 100
        }];

        const lastTable = await RoutingTable.findOne({ slug: preview.slug }).sort({ version: -1 });
        const newVersion = lastTable ? lastTable.version + 1 : 1;

        await RoutingTable.create({
            slug: preview.slug,
            applicationId: preview.applicationId,
            routes,
            version: newVersion,
            generatedAt: Date.now()
        });

        gatewayEvents.emit('deployment:finished', { deploymentId: deployment._id, repoId: preview.repositoryId });
    }

    async destroyPreview(previewId, userId, reason) {
        const preview = await Preview.findById(previewId);
        if (!preview) throw new AppError('Preview not found', 404);
        
        // Authorization
        const repo = await Repository.findById(preview.repositoryId).select('userId').lean();
        if (String(preview.userId) !== String(userId) && (!repo || String(repo.userId) !== String(userId))) {
            throw new AppError('Unauthorized to destroy this preview', 403);
        }
        
        // Allow destroying from any active state (including 'destroying' for expiry job re-entry)
        if (!['ready', 'failed', 'expired', 'creating', 'preparing', 'deploying', 'destroying'].includes(preview.status)) {
            throw new PreviewLifecycleError(`Cannot destroy preview from status: ${preview.status}`);
        }

        // Only transition if not already destroying (prevents double event)
        if (preview.status !== 'destroying') {
            await this._safeTransition(preview._id, 'destroying', 'PREVIEW_DESTROYING', 'USER_COMMAND', userId, reason || 'Manual destroy requested');
        }

        // Cleanup deployments
        for (const target of preview.targets) {
            if (target.deploymentId) {
                try {
                    await removeDeployment(target.deploymentId);
                } catch (err) {
                    logger.warn(`Failed to remove deployment ${target.deploymentId} for preview ${preview._id}: ${err.message}`);
                }
            }
        }

        // Cleanup routing table cache trigger
        await RoutingTable.deleteMany({ slug: preview.slug });
        gatewayEvents.emit('application:deleted', { applicationId: preview.applicationId, slug: preview.slug });

        preview.destroyedAt = new Date();
        preview.destroyReason = reason;
        preview.destroyedBy = userId;
        preview.status = 'destroyed';
        await preview.save();

        await this._recordEvent(preview._id, preview.userId, 'PREVIEW_DESTROYED', 'USER_COMMAND', userId, 'Resources cleaned up');

        await quotaService.decrementPreviewCount(preview.userId);
        await resourceService.updateResourceStatus(String(preview._id), RESOURCE_TYPES.PREVIEW, 'deleted');

        releaseEvents.emitDomainEvent('PREVIEW_DESTROYED', {
            previewId: preview._id,
            slug: preview.slug,
            destroyReason: reason,
            destroyedBy: userId
        }, 'Preview', preview._id);

        return preview;
    }

    async extendPreview(previewId, userId, additionalMinutes) {
        const preview = await Preview.findById(previewId);
        if (!preview) throw new AppError('Preview not found', 404);
        
        // Authorization
        const repo = await Repository.findById(preview.repositoryId).select('userId').lean();
        if (String(preview.userId) !== String(userId) && (!repo || String(repo.userId) !== String(userId))) {
            throw new AppError('Unauthorized to extend this preview', 403);
        }

        if (preview.status !== 'ready') throw new PreviewLifecycleError('Only ready previews can be extended');

        const policy = await previewPolicyService.getPolicy(preview.repositoryId, userId);

        if (preview.extensionCount >= policy.maxExtensions) {
            throw new AppError(`Cannot extend: Max extensions (${policy.maxExtensions}) reached`, 400);
        }

        const maxAllowedExpiresAt = new Date(preview.createdAt.getTime() + (policy.maxLifetimeMinutes * 60 * 1000));
        let newExpiresAt = new Date(preview.expiresAt.getTime() + (additionalMinutes * 60 * 1000));
        
        if (newExpiresAt > maxAllowedExpiresAt) {
            newExpiresAt = maxAllowedExpiresAt;
        }

        preview.expiresAt = newExpiresAt;
        preview.extensionCount += 1;
        await preview.save();

        await this._recordEvent(preview._id, userId, 'TTL_EXTENDED', 'USER_COMMAND', userId, `Extended expiry by ${additionalMinutes} mins`);
        return preview;
    }

    async runExpiryJob() {
        const now = new Date();
        const expiredPreviews = await Preview.find({
            expiresAt: { $lte: now },
            status: { $in: ['ready', 'failed'] }
        }).select('_id userId slug').lean();

        for (const preview of expiredPreviews) {
            try {
                // Atomic lock: Only transition to destroying if it's currently ready/failed
                const lockedPreview = await Preview.findOneAndUpdate(
                    { _id: preview._id, status: { $in: ['ready', 'failed'] } },
                    { status: 'destroying' },
                    { new: true }
                );

                if (lockedPreview) {
                    await this._recordEvent(lockedPreview._id, lockedPreview.userId, 'PREVIEW_EXPIRED', 'PLATFORM_SCHEDULER', 'Platform:ExpiryJob', 'TTL reached');
                    
                    releaseEvents.emitDomainEvent('PREVIEW_EXPIRED', {
                        previewId: lockedPreview._id,
                        slug: lockedPreview.slug,
                        reason: 'TTL_EXPIRY',
                        actor: 'Platform:ExpiryJob'
                    }, 'Preview', lockedPreview._id);

                    await this.destroyPreview(lockedPreview._id, lockedPreview.userId, 'TTL Expired');
                }
            } catch (err) {
                logger.error(`Error expiring preview ${preview._id}: ${err.message}`);
            }
        }
    }

    /**
     * Safe transition: validates the state machine, updates the database,
     * and records an explainability event.
     */
    async _safeTransition(previewId, newStatus, decision, trigger, actor, reason) {
        const preview = await Preview.findById(previewId);
        if (!preview) return null;

        // Validate using centralized lifecycle state machine
        if (!canTransition(preview.status, newStatus)) {
            logger.warn(`[PreviewLifecycle] Invalid transition rejected: ${preview.status} → ${newStatus} for ${previewId}`);
            return null;
        }

        preview.status = newStatus;
        await preview.save();

        await this._recordEvent(previewId, preview.userId, decision, trigger, actor, reason);
        return preview;
    }

    async _recordEvent(previewId, userId, decision, trigger, actor, reason, relatedResource = null) {
        try {
            await PreviewEvent.create({
                previewId,
                userId,
                decision,
                trigger,
                actor: String(actor),
                reason,
                relatedResource
            });
        } catch (err) {
            logger.error(`Failed to record preview event: ${err.message}`);
        }
    }
}

export default new PreviewService();
