import * as k8s from '@kubernetes/client-node';
import logger from '../utils/logger.js';

//  Helpers 

function getCoreClient(kubeConfig) {
    return kubeConfig.makeApiClient(k8s.CoreV1Api);
}

// Normalize K8s API errors into clean, user-friendly messages.

function normalizePodK8sError(err, fallbackMessage, podName) {
    const statusCode = err.response?.statusCode ?? err.statusCode ?? 502;
    const target = podName ? `Pod "${podName}"` : 'Pod';

    if (statusCode === 404) {
        const missing = new Error(`${target} not found`);
        missing.statusCode = 404;
        missing.errorCode = 'POD_NOT_FOUND';
        return missing;
    }

    if (statusCode === 401 || statusCode === 403) {
        const auth = new Error('Cluster authentication failed while accessing pod API');
        auth.statusCode = statusCode;
        auth.errorCode = 'K8S_API_ERROR';
        return auth;
    }

    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
        const conn = new Error('Unable to reach the cluster — verify the server URL is accessible');
        conn.statusCode = 502;
        conn.errorCode = 'K8S_API_ERROR';
        return conn;
    }

    if (err.code === 'ETIMEDOUT' || err.code === 'ESOCKETTIMEDOUT') {
        const timeout = new Error('Cluster connection timed out — the server may be unreachable');
        timeout.statusCode = 504;
        timeout.errorCode = 'K8S_API_ERROR';
        return timeout;
    }

    const generic = new Error(fallbackMessage);
    generic.statusCode = statusCode >= 400 && statusCode < 600 ? statusCode : 502;
    generic.errorCode = 'K8S_API_ERROR';
    return generic;
}

//  Public API 

// List pods in a namespace.
// Returns a structured, safe-to-serialise array with computed restart counts and age.
export async function getPods(kubeConfig, namespace = 'default') {
    const ns = (namespace || 'default').trim() || 'default';
    const client = getCoreClient(kubeConfig);

    try {
        const res = await client.listNamespacedPod({ namespace: ns });
        const pods = res?.items ?? [];

        return pods.map((pod) => {
            const containerStatuses = pod.status?.containerStatuses ?? [];
            const totalRestarts = containerStatuses.reduce(
                (sum, cs) => sum + (cs.restartCount ?? 0), 0,
            );
            const allReady = containerStatuses.length > 0 &&
                containerStatuses.every((cs) => cs.ready === true);

            return {
                name: pod.metadata?.name ?? 'unknown',
                namespace: pod.metadata?.namespace ?? ns,
                status: pod.status?.phase ?? 'Unknown',
                ready: allReady,
                restarts: totalRestarts,
                age: pod.metadata?.creationTimestamp ?? null,
                nodeName: pod.spec?.nodeName ?? null,
                containers: containerStatuses.map((cs) => ({
                    name: cs.name,
                    ready: cs.ready,
                    restarts: cs.restartCount ?? 0,
                    image: cs.image ?? '',
                    state: cs.state ?? {},
                })),
            };
        });
    } catch (err) {
        logger.error('K8s getPods failed', { namespace: ns, error: err.message });
        throw normalizePodK8sError(err, `Failed to list pods in namespace "${ns}"`);
    }
}
// fetch logs of specific pod
export async function getPodLogs(kubeConfig, namespace, podName, options = {}) {
    const ns = (namespace || 'default').trim() || 'default';

    if (!podName || typeof podName !== 'string' || podName.trim().length === 0) {
        const err = new Error('Pod name is required');
        err.statusCode = 400;
        err.errorCode = 'VALIDATION_ERROR';
        throw err;
    }

    const trimmedPodName = podName.trim();
    const tailLines = Math.max(1, Math.min(Number(options.tailLines) || 100, 10000));
    const client = getCoreClient(kubeConfig);

    try {
        const params = {
            name: trimmedPodName,
            namespace: ns,
            tailLines,
        };

        // If a specific container is requested (for multi-container pods)
        if (options.container && typeof options.container === 'string') {
            params.container = options.container.trim();
        }

        const logs = await client.readNamespacedPodLog(params);

        // The API returns an empty string for pods that haven't emitted logs yet
        return typeof logs === 'string' ? logs : '';
    } catch (err) {
        logger.error('K8s getPodLogs failed', {
            namespace: ns,
            podName: trimmedPodName,
            error: err.message,
        });
        throw normalizePodK8sError(
            err,
            `Failed to fetch logs for pod "${trimmedPodName}" in namespace "${ns}"`,
            trimmedPodName,
        );
    }
}
