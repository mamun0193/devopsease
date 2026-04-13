import * as k8s from '@kubernetes/client-node';
import logger from '../utils/logger.js';


//  Constants


const MAX_REPLICAS = 10;
const PATCH_CONTENT_TYPE = 'application/merge-patch+json';


//  Helpers

function getAppsClient(kubeConfig) {
    return kubeConfig.makeApiClient(k8s.AppsV1Api);
}

// validate and normalize replica count
function validateReplicas(replicas) {
    const parsed = Number(replicas);

    if (!Number.isInteger(parsed) || parsed < 1) {
        const err = new Error('Replica count must be an integer ≥ 1');
        err.statusCode = 400;
        err.errorCode = 'INVALID_REPLICAS';
        throw err;
    }

    if (parsed > MAX_REPLICAS) {
        const err = new Error(
            `Replica count cannot exceed ${MAX_REPLICAS} (requested ${parsed})`,
        );
        err.statusCode = 400;
        err.errorCode = 'REPLICA_LIMIT_EXCEEDED';
        throw err;
    }

    return parsed;
}

// Normalise Kubernetes API errors into clean, user-friendly messages.
 
function normalizeScaleK8sError(err, fallbackMessage, deploymentName) {
    const statusCode = err.response?.statusCode ?? err.statusCode ?? 502;
    const target = deploymentName ? `Deployment "${deploymentName}"` : 'Deployment';

    if (statusCode === 404) {
        const missing = new Error(`${target} not found`);
        missing.statusCode = 404;
        missing.errorCode = 'DEPLOYMENT_NOT_FOUND';
        return missing;
    }

    if (statusCode === 401 || statusCode === 403) {
        const auth = new Error(
            'Cluster authentication failed — check your kubeconfig credentials',
        );
        auth.statusCode = statusCode;
        auth.errorCode = 'K8S_API_ERROR';
        return auth;
    }

    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
        const conn = new Error(
            'Unable to reach the cluster — verify the server URL is accessible',
        );
        conn.statusCode = 502;
        conn.errorCode = 'K8S_API_ERROR';
        return conn;
    }

    if (err.code === 'ETIMEDOUT' || err.code === 'ESOCKETTIMEDOUT') {
        const timeout = new Error(
            'Cluster connection timed out — the server may be unreachable',
        );
        timeout.statusCode = 504;
        timeout.errorCode = 'K8S_API_ERROR';
        return timeout;
    }

    const generic = new Error(fallbackMessage);
    generic.statusCode = statusCode >= 400 && statusCode < 600 ? statusCode : 502;
    generic.errorCode = 'K8S_API_ERROR';
    return generic;
}


// Scale a Kubernetes deployment to the desired replica count.

export async function scaleDeployment(kubeConfig, namespace, deploymentName, replicas) {
    //  Input validation 
    const ns = (namespace || 'default').trim() || 'default';

    if (!deploymentName || typeof deploymentName !== 'string' || deploymentName.trim().length === 0) {
        const err = new Error('Deployment name is required');
        err.statusCode = 400;
        err.errorCode = 'VALIDATION_ERROR';
        throw err;
    }

    const trimmedName = deploymentName.trim();
    const targetReplicas = validateReplicas(replicas);
    const client = getAppsClient(kubeConfig);

    // 1. Read current deployment (validates existence) 
    let currentDeployment;
    try {
        currentDeployment = await client.readNamespacedDeployment({
            name: trimmedName,
            namespace: ns,
        });
    } catch (err) {
        logger.error('K8s readNamespacedDeployment failed', {
            namespace: ns,
            deployment: trimmedName,
            error: err.message,
        });
        throw normalizeScaleK8sError(
            err,
            `Failed to read deployment "${trimmedName}" in namespace "${ns}"`,
            trimmedName,
        );
    }

    const previousReplicas = currentDeployment?.spec?.replicas ?? 1;

    //  2. Apply merge-patch to update replicas 
    const patchBody = {
        spec: { replicas: targetReplicas },
    };

    let patched;
    try {
        patched = await client.patchNamespacedDeployment(
            {
                name: trimmedName,
                namespace: ns,
                body: patchBody,
            },
            undefined, // pretty
            undefined, // dryRun
            undefined, // fieldManager
            undefined, // fieldValidation
            undefined, // force
            {
                headers: { 'Content-Type': PATCH_CONTENT_TYPE },
            },
        );
    } catch (err) {
        logger.error('K8s patchNamespacedDeployment failed', {
            namespace: ns,
            deployment: trimmedName,
            targetReplicas,
            error: err.message,
        });
        throw normalizeScaleK8sError(
            err,
            `Failed to scale deployment "${trimmedName}" in namespace "${ns}"`,
            trimmedName,
        );
    }

    const result = {
        name: patched?.metadata?.name ?? trimmedName,
        namespace: patched?.metadata?.namespace ?? ns,
        replicas: patched?.spec?.replicas ?? targetReplicas,
        previousReplicas,
        availableReplicas: patched?.status?.availableReplicas ?? 0,
        updatedAt: patched?.metadata?.managedFields?.[0]?.time ?? new Date().toISOString(),
    };

    logger.info('Deployment scaled', {
        deployment: result.name,
        namespace: result.namespace,
        from: previousReplicas,
        to: result.replicas,
    });

    return result;
}
