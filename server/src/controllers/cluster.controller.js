import {
    connectCluster,
    getUserClusters,
    getClusterPods,
    getClusterNamespaces,
    createNamespace,
    deleteNamespace,
    getPodLogs,
    scaleDeployment,
    getClusterOverview,
} from '../services/cluster.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { standardResponse } from '../utils/apiResponse.js';
import { ValidationError } from '../utils/AppError.js';

export const connectClusterAction = asyncHandler(async (req, res) => {
        const userId = req.user._id;
        const { name, kubeconfig } = req.body ?? {};

    const cluster = await connectCluster({ userId, name, kubeconfig });
    const statusCode = cluster.status === 'connected' ? 201 : 200;

    res.status(statusCode).json(standardResponse({ cluster }));
});

export const getClusters = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const clusters = await getUserClusters(userId);
    res.json(standardResponse({ clusters }));
});

export const getClusterPodsAction = asyncHandler(async (req, res) => {
    const userId = req.user._id;
        const clusterId = req.params.id;
    const namespace = req.query.namespace || 'default';
    const pods = await getClusterPods(userId, clusterId, namespace);
    res.json(standardResponse({ pods }));
});

export const getClusterNamespacesAction = asyncHandler(async (req, res) => {
    const userId = req.user._id;
        const clusterId = req.params.id;

    const namespaces = await getClusterNamespaces(userId, clusterId);
    res.json(standardResponse({ namespaces }));
});

export const createNamespaceAction = asyncHandler(async (req, res) => {
    const userId = req.user._id;
        const clusterId = req.params.id;
        const { name } = req.body ?? {};

    const namespace = await createNamespace(userId, clusterId, name);
    res.status(201).json(standardResponse({ namespace }));
});

export const deleteNamespaceAction = asyncHandler(async (req, res) => {
    const userId = req.user._id;
        const clusterId = req.params.id;
        const { name } = req.params;

    const result = await deleteNamespace(userId, clusterId, name);
    res.json(standardResponse({ namespace: result }));
});

export const getPodLogsAction = asyncHandler(async (req, res) => {
    const userId = req.user._id;
        const clusterId = req.params.id;
        const podName = req.params.podName;
        const namespace = req.query.namespace || 'default';
        const tailLines = req.query.tailLines ? Number(req.query.tailLines) : 100;
        const container = req.query.container || undefined;

    const logs = await getPodLogs(userId, clusterId, namespace, podName, {
        tailLines,
        container,
    });
    res.json(standardResponse({ logs }));
});

export const scaleDeploymentAction = asyncHandler(async (req, res) => {
    const userId = req.user._id;
        const clusterId = req.params.id;
        const deploymentName = req.params.name;
        const { namespace = 'default', replicas } = req.body ?? {};

    if (replicas == null) {
        throw new ValidationError('"replicas" is required in the request body');
    }

    const result = await scaleDeployment(
            userId,
            clusterId,
            namespace,
            deploymentName,
            replicas,
        );

    res.json(standardResponse({
        replicas: result.replicas,
        previousReplicas: result.previousReplicas,
        deployment: result.name,
        namespace: result.namespace,
        availableReplicas: result.availableReplicas,
    }, 'Deployment scaled successfully'));
});

export const getClusterOverviewAction = asyncHandler(async (req, res) => {
    const userId = req.user._id;
        const clusterId = req.params.id;
        const namespace = req.query.namespace || 'default';

    const overview = await getClusterOverview(userId, clusterId, namespace);
    res.json(standardResponse(overview));
});
