import * as k8s from '@kubernetes/client-node';
import logger from '../utils/logger.js';

// Stateless Kubernetes client utilities.
export function loadKubeConfig(kubeconfigString) {
    if (!kubeconfigString || typeof kubeconfigString !== 'string') {
        throw Object.assign(
            new Error('kubeconfig must be a non-empty string'),
            { statusCode: 400, errorCode: 'INVALID_KUBECONFIG' },
        );
    }

    try {
        const kc = new k8s.KubeConfig();
        kc.loadFromString(kubeconfigString);

        // Sanity check: must have at least one cluster + context
        if (!kc.clusters?.length || !kc.contexts?.length) {
            throw new Error('kubeconfig contains no clusters or contexts');
        }

        return kc;
    } catch (err) {
        // Normalize parse errors into user-friendly messages
        const message = err.message?.includes('kubeconfig')
            ? err.message
            : `Invalid kubeconfig: ${err.message || 'unable to parse'}`;

        throw Object.assign(
            new Error(message),
            { statusCode: 400, errorCode: 'INVALID_KUBECONFIG' },
        );
    }
}
// create core client from kubeconfig
export function getCoreClient(kubeConfig) {
    return kubeConfig.makeApiClient(k8s.CoreV1Api);
}

//List pods in a namespace.  Returns a shaped, safe-to-serialise array.
 
export async function listPods(kubeConfig, namespace = 'default') {
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
                })),
            };
        });
    } catch (err) {
        logger.error('K8s listPods failed', { namespace: ns, error: err.message });
        throw normalizeK8sError(err, `Failed to list pods in namespace "${ns}"`);
    }
}

// List all namespaces.  Returns a shaped, safe-to-serialise array.

export async function listNamespaces(kubeConfig) {
    const client = getCoreClient(kubeConfig);

    try {
        const res = await client.listNamespace();
        const namespaces = res?.items ?? [];

        return namespaces.map((ns) => ({
            name: ns.metadata?.name ?? 'unknown',
            status: ns.status?.phase ?? 'Unknown',
            age: ns.metadata?.creationTimestamp ?? null,
            labels: ns.metadata?.labels ?? {},
        }));
    } catch (err) {
        logger.error('K8s listNamespaces failed', { error: err.message });
        throw normalizeK8sError(err, 'Failed to list namespaces');
    }
}

// Internal helpers 

// Normalize K8s API errors into consistent, user-friendly AppError-like objects.
// Strips sensitive details (auth tokens, server URLs) from the message.
function normalizeK8sError(err, fallbackMessage) {
    const status = err.response?.statusCode ?? err.statusCode ?? 502;
    let message = fallbackMessage;

    if (status === 401 || status === 403) {
        message = 'Cluster authentication failed — check your kubeconfig credentials';
    } else if (status === 404) {
        message = 'Cluster API endpoint not found — verify the server URL in kubeconfig';
    } else if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
        message = 'Unable to reach the cluster — verify the server URL is accessible';
    } else if (err.code === 'ETIMEDOUT' || err.code === 'ESOCKETTIMEDOUT') {
        message = 'Cluster connection timed out — the server may be unreachable';
    } else if (err.message) {
        // Use the original message only if it doesn't leak sensitive info
        const safe = err.message.replace(/Bearer\s+\S+/gi, '[REDACTED]')
            .replace(/token=[^\s&]+/gi, 'token=[REDACTED]');
        message = `${fallbackMessage}: ${safe}`;
    }

    const normalized = new Error(message);
    normalized.statusCode = status >= 400 && status < 600 ? status : 502;
    normalized.errorCode = 'K8S_API_ERROR';
    return normalized;
}
