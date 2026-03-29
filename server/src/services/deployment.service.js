import Deployment from '../models/deployment.model.js';
import { assertEnvironmentExists } from './env.service.js';
import {
    runContainer,
    stopContainer,
    removeContainer,
    containerExists
} from '../docker/deployment.js';
import logger from '../utils/logger.js';
import deploymentBroadcaster from '../websocket/deploymentBroadcaster.js';

const PORT_MIN = 3000;
const PORT_MAX = 9000;
const MAX_PORT_ATTEMPTS = 20;
const MAX_NAME_ATTEMPTS = 5;
const MAX_ERROR_LOG_LENGTH = 5000;
const DOCKER_RUN_MAX_RETRIES = 1;
const ROLLBACK_LOOKBACK_LIMIT = 5;

function generatePort() {
    return Math.floor(Math.random() * (PORT_MAX - PORT_MIN + 1)) + PORT_MIN;
}

function sanitizeName(name = 'app') {
    return String(name)
        .toLowerCase()
        .replace(/[^a-z0-9._-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') || 'app';
}

function generateContainerName(repoName) {
    return `${sanitizeName(repoName)}-${Date.now()}`;
}

function truncateErrorLog(message) {
    if (!message) return null;
    return String(message).slice(0, MAX_ERROR_LOG_LENGTH);
}

async function allocatePort() {
    for (let i = 0; i < MAX_PORT_ATTEMPTS; i++) {
        const port = generatePort();
        const conflict = await Deployment.findOne({
            port,
            status: { $in: ['deploying', 'running'] }
        }).lean();

        if (!conflict) return port;
    }
    throw new Error(`Failed to allocate unique port after ${MAX_PORT_ATTEMPTS} attempts`);
}

async function allocateContainerName(repoName) {
    for (let i = 0; i < MAX_NAME_ATTEMPTS; i++) {
        const name = generateContainerName(repoName);

        const dbConflict = await Deployment.findOne({
            containerName: name,
            status: { $in: ['deploying', 'running'] }
        }).lean();

        if (dbConflict) continue;

        const dockerConflict = await containerExists(name);
        if (dockerConflict) continue;

        return name;
    }
    throw new Error(`Failed to allocate unique container name after ${MAX_NAME_ATTEMPTS} attempts`);
}

async function tryCleanupContainer(containerId) {
    if (!containerId) return;
    try {
        await removeContainer(containerId);
    } catch {
        // best-effort cleanup
    }
}

async function attemptDockerRun(imageTag, containerName, port) {
    let lastError = null;

    for (let attempt = 0; attempt <= DOCKER_RUN_MAX_RETRIES; attempt++) {
        try {
            const containerId = await runContainer(imageTag, containerName, port);
            return containerId;
        } catch (error) {
            lastError = error;

            const isTransient = /timeout|connection refused|temporary/i.test(error.message);
            if (!isTransient || attempt >= DOCKER_RUN_MAX_RETRIES) {
                throw error;
            }

            logger.warn('Transient docker run failure, retrying', {
                attempt: attempt + 1,
                containerName,
                error: error.message,
            });

            await new Promise((r) => setTimeout(r, 1000));
        }
    }

    throw lastError;
}

export async function deployFromBuild(build) {
    const imageTag = build.imageTag || build.tag;
    if (!imageTag) {
        throw new Error('Build has no imageTag — cannot deploy');
    }

    const repoName = build.repoName || build.tag?.split(':')[0] || 'app';
    const deploymentEnvironment = await assertEnvironmentExists(
        build.repoId,
        build.environment || 'development'
    );
    let deployment = null;
    let containerId = null;

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
        });

        containerId = await attemptDockerRun(imageTag, containerName, port);

        deployment.containerId = containerId;
        deployment.status = 'running';
        await deployment.save();

        logger.info('Deployment started successfully', {
            deploymentId: String(deployment._id),
            containerName,
            port,
            containerId,
        });

        deploymentBroadcaster.broadcast(deployment);

        return deployment;
    } catch (error) {
        await tryCleanupContainer(containerId);

        if (deployment) {
            deployment.status = 'failed';
            deployment.errorLog = truncateErrorLog(error.stderr || error.message);
            await deployment.save().catch((saveErr) => {
                logger.error('Failed to persist deployment failure', {
                    deploymentId: String(deployment._id),
                    error: saveErr.message,
                });
            });
        }

        logger.error('Deployment failed', {
            buildId: String(build._id),
            imageTag,
            error: error.message,
        });

        return deployment;
    }
}

export async function stopDeployment(deploymentId) {
    const deployment = await Deployment.findById(deploymentId);
    if (!deployment) {
        throw Object.assign(new Error('Deployment not found'), { statusCode: 404 });
    }

    if (deployment.status === 'stopped' || deployment.status === 'removed') {
        return deployment;
    }

    if (deployment.containerId) {
        try {
            await stopContainer(deployment.containerId);
        } catch (error) {
            logger.warn('Failed to stop container', {
                deploymentId: String(deployment._id),
                containerId: deployment.containerId,
                error: error.message,
            });
        }
    }

    deployment.status = 'stopped';
    await deployment.save();

    logger.info('Deployment stopped', {
        deploymentId: String(deployment._id),
        containerId: deployment.containerId,
    });

    deploymentBroadcaster.broadcast(deployment);

    return deployment;
}

export async function removeDeployment(deploymentId) {
    const deployment = await Deployment.findById(deploymentId);
    if (!deployment) {
        throw Object.assign(new Error('Deployment not found'), { statusCode: 404 });
    }

    if (deployment.status === 'removed') {
        return deployment;
    }

    if (deployment.containerId) {
        try {
            await removeContainer(deployment.containerId);
        } catch (error) {
            logger.warn('Failed to remove container', {
                deploymentId: String(deployment._id),
                containerId: deployment.containerId,
                error: error.message,
            });
        }
    }

    deployment.status = 'removed';
    await deployment.save();

    logger.info('Deployment removed', {
        deploymentId: String(deployment._id),
        containerId: deployment.containerId,
    });

    deploymentBroadcaster.broadcast(deployment);

    return deployment;
}

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

        containerId = await attemptDockerRun(previous.imageTag, containerName, port);

        rollbackDeploymentRecord.containerId = containerId;
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
