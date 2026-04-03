import Cluster from '../models/cluster.model.js';
import { encrypt, decrypt } from '../utils/encryption.js';
import { loadKubeConfig, listNamespaces, listPods } from './k8sClient.service.js';
import {
    createNamespace as createK8sNamespace,
    deleteNamespace as deleteK8sNamespace,
    listNamespaces as listK8sNamespaces,
} from './k8sNamespace.service.js';
import logger from '../utils/logger.js';

// connect cluster for user 
export async function connectCluster({ userId, name, kubeconfig }) {
    // Input validation 
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
        const err = new Error('Cluster name is required');
        err.statusCode = 400;
        err.errorCode = 'VALIDATION_ERROR';
        throw err;
    }

    if (!kubeconfig || typeof kubeconfig !== 'string' || kubeconfig.trim().length === 0) {
        const err = new Error('kubeconfig is required');
        err.statusCode = 400;
        err.errorCode = 'VALIDATION_ERROR';
        throw err;
    }

    const trimmedName = name.trim();
    const trimmedConfig = kubeconfig.trim();

    // Duplicate check 
    const existing = await Cluster.findOne({ userId, name: trimmedName });
    if (existing) {
        const err = new Error(`A cluster named "${trimmedName}" already exists`);
        err.statusCode = 409;
        err.errorCode = 'CLUSTER_DUPLICATE';
        throw err;
    }

    // Parse kubeconfig 
    let kc;
    try {
        kc = loadKubeConfig(trimmedConfig);
    } catch (parseErr) {
        // Save a failed record so user can see the error in the list
        const cluster = await Cluster.create({
            userId,
            name: trimmedName,
            kubeconfig: encrypt(trimmedConfig),
            status: 'failed',
            lastError: parseErr.message,
        });
        logger.warn('Cluster connection failed (invalid kubeconfig)', {
            userId, clusterName: trimmedName,
        });
        return cluster.toSafeJSON();
    }

    // Test connection 
    try {
        await listNamespaces(kc);
    } catch (connErr) {
        const cluster = await Cluster.create({
            userId,
            name: trimmedName,
            kubeconfig: encrypt(trimmedConfig),
            status: 'failed',
            lastError: connErr.message,
        });
        logger.warn('Cluster connection failed (API unreachable)', {
            userId, clusterName: trimmedName, error: connErr.message,
        });
        return cluster.toSafeJSON();
    }

    // Success — encrypt and persist 
    const cluster = await Cluster.create({
        userId,
        name: trimmedName,
        kubeconfig: encrypt(trimmedConfig),
        status: 'connected',
        lastError: null,
    });

    logger.info('Cluster connected successfully', {
        userId, clusterName: trimmedName, clusterId: cluster._id,
    });

    return cluster.toSafeJSON();
}

// Get all clusters for a user (kubeconfig excluded).
export async function getUserClusters(userId) {
    const clusters = await Cluster.find({ userId })
        .select('-kubeconfig')
        .sort({ createdAt: -1 })
        .lean();

    return clusters;
}

// Fetch pods from a saved cluster.  Validates ownership.
export async function getClusterPods(userId, clusterId, namespace) {
    const { kc } = await getOwnedClusterKubeConfig(userId, clusterId);

    const ns = (namespace || 'default').trim() || 'default';
    return listPods(kc, ns);
}

// Fetch namespaces from a saved cluster.  Validates ownership.
export async function getClusterNamespaces(userId, clusterId) {
    return getNamespaces(userId, clusterId);
}

export async function getNamespaces(userId, clusterId) {
    const { kc } = await getOwnedClusterKubeConfig(userId, clusterId);
    return listK8sNamespaces(kc);
}

export async function createNamespace(userId, clusterId, name) {
    const { cluster, kc } = await getOwnedClusterKubeConfig(userId, clusterId);
    const namespace = await createK8sNamespace(kc, name);

    logger.info('K8s namespace created', {
        userId,
        clusterId: cluster._id,
        clusterName: cluster.name,
        namespace: namespace.name,
    });

    return namespace;
}

export async function deleteNamespace(userId, clusterId, name) {
    const { cluster, kc } = await getOwnedClusterKubeConfig(userId, clusterId);
    const result = await deleteK8sNamespace(kc, name);

    logger.info('K8s namespace deleted', {
        userId,
        clusterId: cluster._id,
        clusterName: cluster.name,
        namespace: result.name,
    });

    return result;
}

// Internal helpers 

async function getOwnedClusterKubeConfig(userId, clusterId) {
    const cluster = await assertClusterOwnership(userId, clusterId);
    const plainKubeconfig = decrypt(cluster.kubeconfig);
    const kc = loadKubeConfig(plainKubeconfig);

    return { cluster, kc };
}

// Verify the requesting user owns the cluster.
// Returns the full cluster document (including encrypted kubeconfig).
async function assertClusterOwnership(userId, clusterId) {
    const cluster = await Cluster.findById(clusterId);
    if (!cluster) {
        const err = new Error('Cluster not found');
        err.statusCode = 404;
        err.errorCode = 'CLUSTER_NOT_FOUND';
        throw err;
    }

    if (cluster.userId.toString() !== userId.toString()) {
        const err = new Error('Not authorized to access this cluster');
        err.statusCode = 403;
        err.errorCode = 'CLUSTER_FORBIDDEN';
        throw err;
    }

    if (cluster.status !== 'connected') {
        const err = new Error(
            `Cluster "${cluster.name}" is in "${cluster.status}" state and cannot be queried`,
        );
        err.statusCode = 422;
        err.errorCode = 'CLUSTER_UNAVAILABLE';
        throw err;
    }

    return cluster;
}
