import Deployment from '../models/deployment.model.js';
import {
    runContainer,
    stopContainer,
    removeContainer,
    containerExists,
    getRunningContainerIds,
} from '../docker/deployment.js';
import logger from '../utils/logger.js';

// Port allocation 

const PORT_MIN = 3000;
const PORT_MAX = 9000;
const MAX_PORT_ATTEMPTS = 50;

export async function allocatePort() {
    const usedPorts = await getUsedPorts();

    for (let i = 0; i < MAX_PORT_ATTEMPTS; i++) {
        const port = PORT_MIN + Math.floor(Math.random() * (PORT_MAX - PORT_MIN + 1));
        if (!usedPorts.has(port)) return port;
    }

    throw new Error(`Failed to allocate unique port after ${MAX_PORT_ATTEMPTS} attempts`);
}

async function getUsedPorts() {
    const activeDeployments = await Deployment.find({
        status: { $in: ['deploying', 'running'] },
    }).select('port').lean();

    return new Set(activeDeployments.map(d => d.port).filter(Boolean));
}

//  Container name allocation 

const MAX_NAME_ATTEMPTS = 5;

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

export async function allocateContainerName(repoName) {
    for (let i = 0; i < MAX_NAME_ATTEMPTS; i++) {
        const name = generateContainerName(repoName);

        const dbConflict = await Deployment.findOne({
            containerName: name,
            status: { $in: ['deploying', 'running'] },
        }).lean();

        if (dbConflict) continue;

        const dockerConflict = await containerExists(name);
        if (dockerConflict) continue;

        return name;
    }
    throw new Error(`Failed to allocate unique container name after ${MAX_NAME_ATTEMPTS} attempts`);
}

// Container lifecycle 

const DOCKER_RUN_MAX_RETRIES = 1;

export async function createReplica(imageTag, repoName) {
    const containerName = await allocateContainerName(repoName);
    const port = await allocatePort();

    let lastError = null;
    for (let attempt = 0; attempt <= DOCKER_RUN_MAX_RETRIES; attempt++) {
        try {
            const containerId = await runContainer(imageTag, containerName, port);

            logger.info('Created container replica', {
                containerId,
                containerName,
                port,
                imageTag,
            });

            return { containerId, containerName, port };
        } catch (error) {
            lastError = error;
            const isTransient = /timeout|connection refused|temporary/i.test(error.message);
            if (!isTransient || attempt >= DOCKER_RUN_MAX_RETRIES) break;

            logger.warn('Transient docker run failure, retrying', {
                attempt: attempt + 1,
                containerName,
                error: error.message,
            });
            await new Promise(r => setTimeout(r, 1000));
        }
    }

    throw lastError;
}

export async function destroyReplica(containerId) {
    try {
        await stopContainer(containerId);
    } catch {
        // container may already be stopped
    }

    try {
        await removeContainer(containerId);
        logger.info('Removed container replica', { containerId });
    } catch (error) {
        logger.warn('Failed to remove container replica', {
            containerId,
            error: error.message,
        });
    }
}

export async function tryCleanupContainer(containerId) {
    if (!containerId) return;
    try {
        await removeContainer(containerId);
    } catch {
        // best-effort cleanup
    }
}

// State inspection 

export { getRunningContainerIds };
