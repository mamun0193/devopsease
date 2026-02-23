import docker from '../docker/client.js';
import Network from '../models/network.model.js';
import ContainerOwnership from '../models/ContainerOwnership.js';
import logger from '../utils/logger.js';
import { logNetworkEvent, NETWORK_EVENTS } from './network.audit.js';

// Max length for slugified portion of the network name.
const MAX_SLUG_LENGTH = 48;

// Produce a filesystem/Docker-safe slug from an arbitrary string.

function slugify(str) {
    return String(str)
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '_')
        .substring(0, MAX_SLUG_LENGTH);
}

// Build the system-assigned namespaced network name.

function buildNetworkName(userId, projectName) {
    const slug = slugify(projectName);
    return `net_${userId}_${slug}`;
}

class NetworkService {
    async createIsolatedNetwork({ userId, projectId = null, projectName }) {
        const name = buildNetworkName(userId.toString(), projectName);
        let networkDoc;
        try {
            networkDoc = await Network.create({
                userId,
                name,
                dockerNetworkId: 'pending',
                driver: 'bridge',
                projectId,
                usageStatus: 'UNUSED'
            });
        } catch (err) {
            if (err.code === 11000) {
                throw Object.assign(
                    new Error(`Network namespace collision: a network named "${name}" already exists for this user`),
                    { statusCode: 409 }
                );
            }
            throw Object.assign(
                new Error(`Failed to reserve network record: ${err.message}`),
                { statusCode: 500 }
            );
        }

        // DB slot reserved — now create the Docker network
        let dockerNetwork;
        try {
            dockerNetwork = await docker.createNetwork({
                Name: name,
                Driver: 'bridge',
                Labels: {
                    'devopsease.userId': userId.toString(),
                    'devopsease.projectName': projectName,
                    'devopsease.managed': 'true'
                }
            });
        } catch (err) {
            // Docker failed — remove the DB reservation to leave no orphan
            await Network.deleteOne({ _id: networkDoc._id }).catch(() => { });
            throw Object.assign(
                new Error(`Failed to create Docker network: ${err.message}`),
                { statusCode: 500 }
            );
        }

        // Stamp the real Docker network ID
        networkDoc.dockerNetworkId = dockerNetwork.id;
        await networkDoc.save();

        logNetworkEvent({
            event: NETWORK_EVENTS.NETWORK_CREATED,
            userId,
            metadata: { networkId: networkDoc._id.toString(), name, dockerNetworkId: dockerNetwork.id }
        });

        logger.info('Isolated network created', {
            userId: userId.toString(),
            name,
            dockerNetworkId: dockerNetwork.id
        });

        return networkDoc;
    }

    // Attach a container to a user-owned network.
    // Enforces that the network belongs to the calling user.

    async attachContainerToNetwork({ containerId, networkId, userId }) {
        // Tenant-scoped lookup — 404 if network belongs to another user
        const networkDoc = await Network.findOne({ _id: networkId, userId });
        if (!networkDoc) {
            throw Object.assign(
                new Error('Network not found or access denied'),
                { statusCode: 404 }
            );
        }

        // Verify container is owned by this user before attaching.

        const ownership = await ContainerOwnership.findOne({ userId, containerId });
        if (!ownership) {
            throw Object.assign(
                new Error('Container not found or access denied'),
                { statusCode: 404 }
            );
        }

        try {
            const net = docker.getNetwork(networkDoc.dockerNetworkId);
            await net.connect({ Container: containerId });
        } catch (err) {
            throw Object.assign(
                new Error(`Failed to attach container to network: ${err.message}`),
                { statusCode: 500 }
            );
        }

        networkDoc.usageStatus = 'ACTIVE';
        await networkDoc.save();

        return networkDoc;
    }

// Delete a user-owned network.
// Blocks deletion if containers are still attached.
// Rolls back DB deletion if Docker removal fails.

    async deleteNetwork({ networkId, userId }) {
        // Tenant-scoped lookup
        const networkDoc = await Network.findOne({ _id: networkId, userId });
        if (!networkDoc) {
            // Silently succeed if already gone — idempotent
            return { deleted: true, notFound: true };
        }

        // Inspect Docker network to check for attached containers
        let inspectData = null;
        try {
            const net = docker.getNetwork(networkDoc.dockerNetworkId);
            inspectData = await net.inspect();
        } catch (err) {
            // Docker network is already gone — clean up DB record and return
            if (err.statusCode === 404 || err.message?.includes('No such network')) {
                logger.warn('Docker network already deleted, removing DB record', {
                    // Log internal ID only — never expose to callers
                    networkDocId: networkDoc._id.toString(),
                    name: networkDoc.name
                });
                logNetworkEvent({
                    event: NETWORK_EVENTS.NETWORK_DOCKER_GONE,
                    userId,
                    metadata: { networkId: networkDoc._id.toString(), name: networkDoc.name }
                });
                await Network.deleteOne({ _id: networkDoc._id });
                return { deleted: true };
            }
            // Redact internal Docker ID from user-facing error; log it internally
            logger.error('Docker network inspect failed', {
                dockerNetworkId: networkDoc.dockerNetworkId,
                error: err.message
            });
            throw Object.assign(
                new Error('Failed to inspect network state'),
                { statusCode: 500 }
            );
        }

        // Block deletion if containers are attached
        const attachedContainers = inspectData?.Containers
            ? Object.keys(inspectData.Containers)
            : [];

        if (attachedContainers.length > 0) {
            logNetworkEvent({
                event: NETWORK_EVENTS.NETWORK_DELETE_BLOCKED,
                userId,
                metadata: {
                    networkId: networkDoc._id.toString(),
                    name: networkDoc.name,
                    attachedContainerCount: attachedContainers.length
                }
            });
            throw Object.assign(
                new Error(`Cannot delete network "${networkDoc.name}": ${attachedContainers.length} container(s) still attached`),
                { statusCode: 409 }
            );
        }

        // Remove Docker network
        try {
            const net = docker.getNetwork(networkDoc.dockerNetworkId);
            await net.remove();
        } catch (err) {
            // Not found = already gone, safe to proceed
            if (!err.message?.includes('No such network') && err.statusCode !== 404) {
                throw Object.assign(
                    new Error(`Failed to remove Docker network: ${err.message}`),
                    { statusCode: 500 }
                );
            }
        }

        // Remove DB record
        await Network.deleteOne({ _id: networkDoc._id });

        logNetworkEvent({
            event: NETWORK_EVENTS.NETWORK_DELETED,
            userId,
            metadata: {
                networkId: networkDoc._id.toString(),
                name: networkDoc.name,
                dockerNetworkId: networkDoc.dockerNetworkId
            }
        });

        logger.info('Network deleted', { userId: userId.toString(), name: networkDoc.name });
        return { deleted: true };
    }

    // Reconcile DB network records against live Docker state for a given user.
    // Updates usageStatus to ACTIVE or UNUSED depending on attached containers.
    // Handles networks that were manually deleted outside of the platform.
    
    async reconcileNetworks(userId) {
        const networks = await Network.find({ userId });

        let updated = 0;
        let orphaned = 0;

        for (const networkDoc of networks) {
            try {
                const net = docker.getNetwork(networkDoc.dockerNetworkId);
                const inspectData = await net.inspect();

                const containers = inspectData?.Containers
                    ? Object.keys(inspectData.Containers)
                    : [];

                const newStatus = containers.length > 0 ? 'ACTIVE' : 'UNUSED';

                if (networkDoc.usageStatus !== newStatus) {
                    networkDoc.usageStatus = newStatus;
                    await networkDoc.save();
                    updated++;
                }
            } catch (err) {
                // Docker network gone — mark as UNUSED and log warning
                if (err.statusCode === 404 || err.message?.includes('No such network')) {
                    orphaned++;
                    if (networkDoc.usageStatus !== 'UNUSED') {
                        networkDoc.usageStatus = 'UNUSED';
                        await networkDoc.save();
                        updated++;
                    }
                    logNetworkEvent({
                        event: NETWORK_EVENTS.NETWORK_DOCKER_GONE,
                        userId,
                        metadata: {
                            networkId: networkDoc._id.toString(),
                            name: networkDoc.name,
                            dockerNetworkId: networkDoc.dockerNetworkId
                        }
                    });
                } else {
                    logger.warn('Failed to inspect network during reconciliation', {
                        networkId: networkDoc._id.toString(),
                        error: err.message
                    });
                }
            }
        }

        logNetworkEvent({
            event: NETWORK_EVENTS.NETWORK_RECONCILED,
            userId,
            metadata: {
                total: networks.length,
                updated,
                orphaned
            }
        });

        logger.info('Network reconciliation complete', {
            userId: userId.toString(),
            total: networks.length,
            updated,
            orphaned
        });

        return { reconciled: networks.length, updated, orphaned };
    }
}

export default new NetworkService();
