import k8s from '@kubernetes/client-node';
import logger from '../utils/logger.js';

const RESERVED_NAMESPACES = new Set(['kube-system', 'kube-public', 'kube-node-lease']);
const DNS_LABEL_REGEX = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/;

function getCoreClient(kubeConfig) {
    return kubeConfig.makeApiClient(k8s.CoreV1Api);
}

function validateNamespaceName(name) {
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
        const err = new Error('Namespace name is required');
        err.statusCode = 400;
        err.errorCode = 'VALIDATION_ERROR';
        throw err;
    }

    const normalizedName = name.trim();
    const isValidDnsLabel =
        normalizedName.length <= 63 &&
        DNS_LABEL_REGEX.test(normalizedName);

    if (!isValidDnsLabel) {
        const err = new Error(
            'Namespace name must be a valid DNS label (lowercase letters, numbers, and hyphens only)',
        );
        err.statusCode = 400;
        err.errorCode = 'INVALID_NAMESPACE_NAME';
        throw err;
    }

    return normalizedName;
}

function assertNotReservedNamespace(name, action) {
    if (!RESERVED_NAMESPACES.has(name)) {
        return;
    }

    const err = new Error(
        action === 'create'
            ? `Namespace "${name}" is reserved and cannot be created`
            : `Namespace "${name}" is a system namespace and cannot be deleted`,
    );
    err.statusCode = 400;
    err.errorCode = 'RESERVED_NAMESPACE';
    throw err;
}

function normalizeNamespaceK8sError(err, fallbackMessage, namespaceName) {
    const statusCode = err.response?.statusCode ?? err.statusCode ?? 502;
    const target = namespaceName ? `Namespace "${namespaceName}"` : 'Namespace';

    if (statusCode === 409) {
        const exists = new Error(`${target} already exists`);
        exists.statusCode = 409;
        exists.errorCode = 'NAMESPACE_ALREADY_EXISTS';
        return exists;
    }

    if (statusCode === 404) {
        const missing = new Error(`${target} not found`);
        missing.statusCode = 404;
        missing.errorCode = 'NAMESPACE_NOT_FOUND';
        return missing;
    }

    if (statusCode === 401 || statusCode === 403) {
        const auth = new Error('Cluster authentication failed while accessing namespace API');
        auth.statusCode = statusCode;
        auth.errorCode = 'K8S_API_ERROR';
        return auth;
    }

    const generic = new Error(fallbackMessage);
    generic.statusCode = statusCode >= 400 && statusCode < 600 ? statusCode : 502;
    generic.errorCode = 'K8S_API_ERROR';
    return generic;
}

export async function createNamespace(kubeConfig, name) {
    const namespaceName = validateNamespaceName(name);
    assertNotReservedNamespace(namespaceName, 'create');

    const client = getCoreClient(kubeConfig);
    const body = {
        apiVersion: 'v1',
        kind: 'Namespace',
        metadata: { name: namespaceName },
    };

    try {
        const created = await client.createNamespace({ body });
        const metadata = created?.metadata ?? {};

        return {
            name: metadata.name ?? namespaceName,
            status: created?.status?.phase ?? 'Active',
            age: metadata.creationTimestamp ?? null,
            labels: metadata.labels ?? {},
        };
    } catch (err) {
        logger.error('K8s createNamespace failed', {
            namespace: namespaceName,
            error: err.message,
        });
        throw normalizeNamespaceK8sError(
            err,
            `Failed to create namespace "${namespaceName}"`,
            namespaceName,
        );
    }
}

export async function deleteNamespace(kubeConfig, name) {
    const namespaceName = validateNamespaceName(name);
    assertNotReservedNamespace(namespaceName, 'delete');

    const client = getCoreClient(kubeConfig);

    try {
        await client.deleteNamespace({ name: namespaceName });
        return {
            name: namespaceName,
            deleted: true,
        };
    } catch (err) {
        logger.error('K8s deleteNamespace failed', {
            namespace: namespaceName,
            error: err.message,
        });
        throw normalizeNamespaceK8sError(
            err,
            `Failed to delete namespace "${namespaceName}"`,
            namespaceName,
        );
    }
}

export async function listNamespaces(kubeConfig) {
    const client = getCoreClient(kubeConfig);

    try {
        const res = await client.listNamespace();
        const namespaces = res?.items ?? [];

        return namespaces.map((namespace) => ({
            name: namespace.metadata?.name ?? 'unknown',
            status: namespace.status?.phase ?? 'Unknown',
            age: namespace.metadata?.creationTimestamp ?? null,
            labels: namespace.metadata?.labels ?? {},
        }));
    } catch (err) {
        logger.error('K8s listNamespaces failed (namespace service)', { error: err.message });
        throw normalizeNamespaceK8sError(err, 'Failed to list namespaces');
    }
}
