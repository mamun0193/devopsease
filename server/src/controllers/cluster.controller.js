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


export const connectClusterAction = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { name, kubeconfig } = req.body ?? {};

        const cluster = await connectCluster({ userId, name, kubeconfig });
        const statusCode = cluster.status === 'connected' ? 201 : 200;

        res.status(statusCode).json({ cluster });
    } catch (error) {
        next(error);
    }
};


export const getClusters = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const clusters = await getUserClusters(userId);

        res.json({ clusters });
    } catch (error) {
        next(error);
    }
};


export const getClusterPodsAction = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const clusterId = req.params.id;
        const namespace = req.query.namespace || 'default';

        const pods = await getClusterPods(userId, clusterId, namespace);
        res.json({ pods });
    } catch (error) {
        next(error);
    }
};


export const getClusterNamespacesAction = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const clusterId = req.params.id;

        const namespaces = await getClusterNamespaces(userId, clusterId);
        res.json({ namespaces });
    } catch (error) {
        next(error);
    }
};


export const createNamespaceAction = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const clusterId = req.params.id;
        const { name } = req.body ?? {};

        const namespace = await createNamespace(userId, clusterId, name);
        res.status(201).json({ namespace });
    } catch (error) {
        next(error);
    }
};


export const deleteNamespaceAction = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const clusterId = req.params.id;
        const { name } = req.params;

        const result = await deleteNamespace(userId, clusterId, name);
        res.json({ namespace: result });
    } catch (error) {
        next(error);
    }
};


export const getPodLogsAction = async (req, res, next) => {
    try {
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
        res.json({ logs });
    } catch (error) {
        next(error);
    }
};


export const scaleDeploymentAction = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const clusterId = req.params.id;
        const deploymentName = req.params.name;
        const { namespace = 'default', replicas } = req.body ?? {};

        if (replicas == null) {
            const err = new Error('"replicas" is required in the request body');
            err.statusCode = 400;
            err.errorCode = 'VALIDATION_ERROR';
            throw err;
        }

        const result = await scaleDeployment(
            userId,
            clusterId,
            namespace,
            deploymentName,
            replicas,
        );

        res.json({
            message: 'Deployment scaled successfully',
            replicas: result.replicas,
            previousReplicas: result.previousReplicas,
            deployment: result.name,
            namespace: result.namespace,
            availableReplicas: result.availableReplicas,
        });
    } catch (error) {
        next(error);
    }
};


export const getClusterOverviewAction = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const clusterId = req.params.id;
        const namespace = req.query.namespace || 'default';

        const overview = await getClusterOverview(userId, clusterId, namespace);
        res.json(overview);
    } catch (error) {
        next(error);
    }
};
