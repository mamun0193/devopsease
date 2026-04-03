import {
    connectCluster,
    getUserClusters,
    getClusterPods,
    getClusterNamespaces,
    createNamespace,
    deleteNamespace,
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
