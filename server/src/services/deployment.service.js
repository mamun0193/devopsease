import Deployment from '../models/deployment.model.js';
import Repository from '../models/repository.model.js';
import { assertEnvironmentExists } from './env.service.js';
import { getDecryptedSecretsMap } from './secret.service.js';
import {
    createReplica,
    destroyReplica,
    tryCleanupContainer,
    getRunningContainerIds,
    allocateContainerName,
    allocatePort,
} from './docker.service.js';
import { stopContainer } from '../docker/deployment.js';
import logger from '../utils/logger.js';
import deploymentBroadcaster from '../websocket/deploymentBroadcaster.js';

const MAX_REPLICAS = 10;
const MAX_ERROR_LOG_LENGTH = 5000;
const ROLLBACK_LOOKBACK_LIMIT = 5;

function truncateErrorLog(message) {
    if (!message) return null;
    return String(message).slice(0, MAX_ERROR_LOG_LENGTH);
}

async function resolveDeploymentSecretEnv(deployment) {
    const repo = await Repository.findById(deployment.repoId).select('userId').lean();
    if (!repo?.userId) {
        return {};
    }

    return getDecryptedSecretsMap(repo.userId, deployment.environment || 'development');
}

// Reconciliation engine: compare desired replica count against actual running containers and create/remove containers to reach the desired state.

export async function reconcileDeployment(deploymentId) {
    const deployment = await Deployment.findById(deploymentId);
    if (!deployment) {
        throw Object.assign(new Error('Deployment not found'), { statusCode: 404 });
    }

    if (!['deploying', 'running'].includes(deployment.status)) {
        logger.warn('Skipping reconciliation — deployment not active', {
            deploymentId: String(deployment._id),
            status: deployment.status,
        });
        return deployment;
    }

    const desired = deployment.desiredReplicas;
    const repoName = deployment.imageTag?.split(':')[0] || 'app';
    const runtimeSecretEnv = await resolveDeploymentSecretEnv(deployment);

    //  1. Discover actual running containers 
    const recordedIds = deployment.containerIds || [];
    const actualRunning = await getRunningContainerIds(recordedIds);
    const actual = actualRunning.length;

    logger.info('Reconciliation started', {
        deploymentId: String(deployment._id),
        desired,
        actual,
        recordedIds,
        actualRunning,
    });

    //  2. Clean dead containers from the record 
    const deadIds = recordedIds.filter(id => !actualRunning.includes(id));
    for (const deadId of deadIds) {
        await tryCleanupContainer(deadId);
        logger.info('Cleaned up dead container', {
            deploymentId: String(deployment._id),
            containerId: deadId,
        });
    }

    let liveIds = [...actualRunning];

    // 3a. Scale UP — create missing replicas 
    if (actual < desired) {
        const toCreate = desired - actual;
        const newIds = [];

        try {
            for (let i = 0; i < toCreate; i++) {
                const { containerId } = await createReplica(
                    deployment.imageTag,
                    `${repoName}-r${actual + i}`,
                    runtimeSecretEnv,
                );
                newIds.push(containerId);

                logger.info('Created replica', {
                    deploymentId: String(deployment._id),
                    containerId,
                    index: actual + i,
                });
            }
            liveIds = [...liveIds, ...newIds];
        } catch (error) {
            // Partial failure — clean up newly created containers
            for (const id of newIds) {
                await tryCleanupContainer(id);
            }

            logger.error('Reconciliation scale-up failed, partial cleanup done', {
                deploymentId: String(deployment._id),
                created: newIds.length,
                target: toCreate,
                error: error.message,
            });

            // Persist whatever state we have
            deployment.containerIds = liveIds;
            deployment.containerId = liveIds[0] || null;
            deployment.status = liveIds.length > 0 ? 'running' : 'failed';
            deployment.errorLog = truncateErrorLog(error.stderr || error.message);
            await deployment.save();

            deploymentBroadcaster.broadcast(deployment);
            throw Object.assign(
                new Error(`Reconciliation failed: ${error.message}`),
                { statusCode: 500 }
            );
        }
    }

    // 3b. Scale DOWN — remove excess replicas 
    if (actual > desired) {
        const toRemove = actual - desired;
        const idsToRemove = liveIds.slice(-toRemove);
        const idsToKeep = liveIds.slice(0, desired);

        for (const id of idsToRemove) {
            await destroyReplica(id);
            logger.info('Removed excess replica', {
                deploymentId: String(deployment._id),
                containerId: id,
            });
        }

        liveIds = idsToKeep;
    }

    //  4. Persist reconciled state 
    deployment.containerIds = liveIds;
    deployment.containerId = liveIds[0] || null;
    deployment.status = liveIds.length > 0 ? 'running' : 'failed';
    if (deployment.status === 'failed') {
        deployment.errorLog = truncateErrorLog('All containers died during reconciliation');
    }
    await deployment.save();

    logger.info('Reconciliation complete', {
        deploymentId: String(deployment._id),
        desired,
        actual: liveIds.length,
        containerIds: liveIds,
        status: deployment.status,
    });

    deploymentBroadcaster.broadcast(deployment);

    return deployment;
}

//  Deploy from build 

export async function deployFromBuild(build, { replicas = 1 } = {}) {
    const imageTag = build.imageTag || build.tag;
    if (!imageTag) {
        throw new Error('Build has no imageTag — cannot deploy');
    }

    const desiredReplicas = Math.max(1, Math.min(Math.floor(replicas), MAX_REPLICAS));
    const repoName = build.repoName || build.tag?.split(':')[0] || 'app';
    const deploymentEnvironment = await assertEnvironmentExists(
        build.repoId,
        build.environment || 'development'
    );

    let deployment = null;

    try {
        const containerName = await allocateContainerName(repoName);
        const port = await allocatePort();

        deployment = await Deployment.create({
            repoId: build.repoId,
            buildId: build._id,
            imageTag,
            containerName,
            port,
            environment: deploymentEnvironment,
            status: 'deploying',
            desiredReplicas,
            containerIds: [],
        });

        logger.info('Deployment record created, starting reconciliation', {
            deploymentId: String(deployment._id),
            desiredReplicas,
        });

        // Reconcile will spin up desiredReplicas containers
        deployment = await reconcileDeployment(deployment._id);

        return deployment;
    } catch (error) {
        if (deployment) {
            // Re-fetch to get any state reconcile may have saved
            const latest = await Deployment.findById(deployment._id);
            if (latest && latest.status !== 'failed') {
                latest.status = 'failed';
                latest.errorLog = truncateErrorLog(error.stderr || error.message);
                await latest.save().catch((saveErr) => {
                    logger.error('Failed to persist deployment failure', {
                        deploymentId: String(deployment._id),
                        error: saveErr.message,
                    });
                });
            }
        }

        logger.error('Deployment failed', {
            buildId: String(build._id),
            imageTag,
            desiredReplicas,
            error: error.message,
        });

        return deployment;
    }
}

// Scale deployment (desired-state) 

export async function scaleDeployment(deploymentId, newReplicaCount) {
    if (!Number.isInteger(newReplicaCount) || newReplicaCount < 1) {
        throw Object.assign(
            new Error('Replica count must be an integer >= 1'),
            { statusCode: 400 }
        );
    }
    if (newReplicaCount > MAX_REPLICAS) {
        throw Object.assign(
            new Error(`Replica count cannot exceed ${MAX_REPLICAS}`),
            { statusCode: 400 }
        );
    }

    const deployment = await Deployment.findById(deploymentId);
    if (!deployment) {
        throw Object.assign(new Error('Deployment not found'), { statusCode: 404 });
    }

    if (deployment.status !== 'running') {
        throw Object.assign(
            new Error(`Cannot scale a deployment with status "${deployment.status}"`),
            { statusCode: 400 }
        );
    }

    // Update desired state
    deployment.desiredReplicas = newReplicaCount;
    await deployment.save();

    logger.info('Desired replicas updated, triggering reconciliation', {
        deploymentId: String(deployment._id),
        desiredReplicas: newReplicaCount,
    });

    // Let the reconciler bring actual state to match
    return reconcileDeployment(deploymentId);
}

// Stop deployment 

export async function stopDeployment(deploymentId) {
    const deployment = await Deployment.findById(deploymentId);
    if (!deployment) {
        throw Object.assign(new Error('Deployment not found'), { statusCode: 404 });
    }

    if (deployment.status === 'stopped' || deployment.status === 'removed') {
        return deployment;
    }

    const allIds = deployment.containerIds?.length
        ? deployment.containerIds
        : (deployment.containerId ? [deployment.containerId] : []);

    for (const cId of allIds) {
        try {
            await stopContainer(cId);
            logger.info('Stopped container', {
                deploymentId: String(deployment._id),
                containerId: cId,
            });
        } catch (error) {
            logger.warn('Failed to stop container', {
                deploymentId: String(deployment._id),
                containerId: cId,
                error: error.message,
            });
        }
    }

    deployment.status = 'stopped';
    await deployment.save();

    logger.info('Deployment stopped', {
        deploymentId: String(deployment._id),
        containerIds: allIds,
    });

    deploymentBroadcaster.broadcast(deployment);

    return deployment;
}

// Remove deployment 

export async function removeDeployment(deploymentId) {
    const deployment = await Deployment.findById(deploymentId);
    if (!deployment) {
        throw Object.assign(new Error('Deployment not found'), { statusCode: 404 });
    }

    if (deployment.status === 'removed') {
        return deployment;
    }

    const allIds = deployment.containerIds?.length
        ? deployment.containerIds
        : (deployment.containerId ? [deployment.containerId] : []);

    for (const cId of allIds) {
        await destroyReplica(cId);
        logger.info('Removed container', {
            deploymentId: String(deployment._id),
            containerId: cId,
        });
    }

    deployment.status = 'removed';
    deployment.containerIds = [];
    await deployment.save();

    logger.info('Deployment removed', {
        deploymentId: String(deployment._id),
        containerIds: allIds,
    });

    deploymentBroadcaster.broadcast(deployment);

    return deployment;
}

//  Rollback deployment 

export async function rollbackDeployment(deploymentId, options = {}) {
    const rollbackReason = options?.reason ? String(options.reason).slice(0, 500) : null;
    const current = await Deployment.findById(deploymentId);
    if (!current) {
        throw Object.assign(new Error('Deployment not found'), { statusCode: 404 });
    }

    if (!current.repoId) {
        throw Object.assign(new Error('Invalid deployment: repoId missing'), { statusCode: 400 });
    }

    if (!current.imageTag) {
        throw Object.assign(new Error('Invalid deployment: imageTag missing'), { statusCode: 400 });
    }

    logger.info('Rollback triggered', {
        deploymentId: String(current._id),
        repoId: String(current.repoId),
        reason: rollbackReason,
    });

    const previousCandidates = await Deployment.find({
        repoId: current.repoId,
        _id: { $ne: current._id },
        status: 'running',
    })
        .sort({ createdAt: -1 })
        .limit(ROLLBACK_LOOKBACK_LIMIT)
        .lean();

    const previous = previousCandidates[0] || null;

    if (!previous) {
        throw Object.assign(
            new Error('No previous deployment found to rollback to'),
            { statusCode: 400 }
        );
    }

    if (!previous.imageTag) {
        throw Object.assign(new Error('Previous deployment has no imageTag to rollback to'), {
            statusCode: 400,
        });
    }

    logger.info('Rollback source and target selected', {
        sourceDeploymentId: String(current._id),
        targetDeploymentId: String(previous._id),
        targetImageTag: previous.imageTag,
    });

    if (['running', 'deploying'].includes(current.status)) {
        await stopDeployment(deploymentId);
    }

    const repoName = previous.imageTag?.split(':')[0] || 'app';
    const runtimeSecretEnv = await resolveDeploymentSecretEnv(previous);
    let rollbackDeploymentRecord = null;
    let containerId = null;

    try {
        const containerName = await allocateContainerName(repoName);
        const port = await allocatePort();

        rollbackDeploymentRecord = await Deployment.create({
            repoId: previous.repoId,
            buildId: previous.buildId,
            imageTag: previous.imageTag,
            containerName,
            port,
            environment: previous.environment,
            status: 'deploying',
            isRollback: true,
            rolledBackFrom: current._id,
            rollbackReason,
        });

        deploymentBroadcaster.broadcast(rollbackDeploymentRecord);

        const result = await createReplica(previous.imageTag, repoName, runtimeSecretEnv);
        containerId = result.containerId;

        rollbackDeploymentRecord.containerId = containerId;
        rollbackDeploymentRecord.containerIds = [containerId];
        rollbackDeploymentRecord.status = 'running';
        await rollbackDeploymentRecord.save();

        logger.info('Rollback deployment successful', {
            rollbackId: String(rollbackDeploymentRecord._id),
            sourceDeploymentId: String(current._id),
            targetDeploymentId: String(previous._id),
            imageTag: rollbackDeploymentRecord.imageTag,
            result: 'success',
        });

        deploymentBroadcaster.broadcast(rollbackDeploymentRecord);

        return rollbackDeploymentRecord;
    } catch (error) {
        await tryCleanupContainer(containerId);

        if (rollbackDeploymentRecord) {
            rollbackDeploymentRecord.status = 'failed';
            rollbackDeploymentRecord.errorLog = truncateErrorLog(error.stderr || error.message);
            await rollbackDeploymentRecord.save().catch((saveErr) => {
                logger.error('Failed to persist rollback failure', {
                    deploymentId: String(rollbackDeploymentRecord._id),
                    error: saveErr.message,
                });
            });

            deploymentBroadcaster.broadcast(rollbackDeploymentRecord);
        }

        logger.error('Rollback failed', {
            sourceDeploymentId: String(current._id),
            targetDeploymentId: String(previous._id),
            imageTag: previous.imageTag,
            result: 'failed',
            error: error.message,
        });

        throw error;
    }
}
