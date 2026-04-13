import * as k8s from '@kubernetes/client-node';
import logger from '../utils/logger.js';

// Helpers

function getCoreClient(kubeConfig) {
    return kubeConfig.makeApiClient(k8s.CoreV1Api);
}

function getAppsClient(kubeConfig) {
    return kubeConfig.makeApiClient(k8s.AppsV1Api);
}

// Normalize K8s API errors into clean, user-friendly messages.
 
function normalizeDashboardK8sError(err, fallbackMessage) {
    const statusCode = err.response?.statusCode ?? err.statusCode ?? 502;

    if (statusCode === 401 || statusCode === 403) {
        const auth = new Error('Cluster authentication failed — check your kubeconfig credentials');
        auth.statusCode = statusCode;
        auth.errorCode = 'K8S_API_ERROR';
        return auth;
    }

    if (statusCode === 404) {
        const notFound = new Error('Namespace not found or API endpoint unavailable');
        notFound.statusCode = 404;
        notFound.errorCode = 'NAMESPACE_NOT_FOUND';
        return notFound;
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

//  Data Fetchers 

async function fetchPods(coreClient, namespace) {
    const res = await coreClient.listNamespacedPod({ namespace });
    const pods = res?.items ?? [];

    return pods.map((pod) => {
        const containerStatuses = pod.status?.containerStatuses ?? [];
        const totalRestarts = containerStatuses.reduce(
            (sum, cs) => sum + (cs.restartCount ?? 0), 0,
        );

        return {
            name: pod.metadata?.name ?? 'unknown',
            status: pod.status?.phase ?? 'Unknown',
            restarts: totalRestarts,
            age: pod.metadata?.creationTimestamp ?? null,
        };
    });
}

async function fetchServices(coreClient, namespace) {
    const res = await coreClient.listNamespacedService({ namespace });
    const services = res?.items ?? [];

    return services.map((svc) => {
        const ports = (svc.spec?.ports ?? []).map((p) => ({
            port: p.port,
            targetPort: p.targetPort,
            protocol: p.protocol ?? 'TCP',
            ...(p.nodePort ? { nodePort: p.nodePort } : {}),
        }));

        return {
            name: svc.metadata?.name ?? 'unknown',
            type: svc.spec?.type ?? 'ClusterIP',
            clusterIP: svc.spec?.clusterIP ?? 'None',
            ports,
        };
    });
}

async function fetchDeployments(appsClient, namespace) {
    const res = await appsClient.listNamespacedDeployment({ namespace });
    const deployments = res?.items ?? [];

    return deployments.map((dep) => ({
        name: dep.metadata?.name ?? 'unknown',
        replicas: dep.spec?.replicas ?? 0,
        availableReplicas: dep.status?.availableReplicas ?? 0,
        age: dep.metadata?.creationTimestamp ?? null,
    }));
}

// Aggregated cluster overview for a given namespace.

export async function getClusterOverview(kubeConfig, namespace = 'default') {
    const ns = (namespace || 'default').trim() || 'default';
    const coreClient = getCoreClient(kubeConfig);
    const appsClient = getAppsClient(kubeConfig);

    try {
        // Fetch all three resource types in parallel for speed
        const [pods, services, deployments] = await Promise.all([
            fetchPods(coreClient, ns),
            fetchServices(coreClient, ns),
            fetchDeployments(appsClient, ns),
        ]);

        logger.info('Cluster overview fetched', {
            namespace: ns,
            pods: pods.length,
            services: services.length,
            deployments: deployments.length,
        });

        return { pods, services, deployments };
    } catch (err) {
        logger.error('K8s getClusterOverview failed', {
            namespace: ns,
            error: err.message,
        });
        throw normalizeDashboardK8sError(
            err,
            `Failed to fetch cluster overview for namespace "${ns}"`,
        );
    }
}
