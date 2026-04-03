import yaml from 'js-yaml';

const DNS_LABEL_REGEX = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/;
const ENV_KEY_REGEX = /^[A-Za-z_][A-Za-z0-9_]*$/;

function isValidDnsLabel(value) {
    return typeof value === 'string' &&
        value.length > 0 &&
        value.length <= 63 &&
        DNS_LABEL_REGEX.test(value);
}

function assertName(name) {
    if (!isValidDnsLabel(name)) {
        const err = new Error('Deployment name must be a valid lowercase DNS label');
        err.statusCode = 400;
        err.errorCode = 'INVALID_DEPLOYMENT_NAME';
        throw err;
    }
}

function assertNamespace(namespace) {
    if (!isValidDnsLabel(namespace)) {
        const err = new Error('Namespace must be a valid lowercase DNS label');
        err.statusCode = 400;
        err.errorCode = 'INVALID_NAMESPACE_NAME';
        throw err;
    }
}

function assertImage(image) {
    if (!image || typeof image !== 'string' || image.trim().length === 0) {
        const err = new Error('Image is required');
        err.statusCode = 400;
        err.errorCode = 'VALIDATION_ERROR';
        throw err;
    }
}

function parseReplicas(replicas) {
    const parsed = Number(replicas ?? 1);
    if (!Number.isInteger(parsed) || parsed < 1) {
        const err = new Error('Replicas must be an integer greater than or equal to 1');
        err.statusCode = 400;
        err.errorCode = 'INVALID_REPLICAS';
        throw err;
    }
    return parsed;
}

function parseContainerPort(containerPort) {
    const parsed = Number(containerPort ?? 3000);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
        const err = new Error('containerPort must be an integer between 1 and 65535');
        err.statusCode = 400;
        err.errorCode = 'INVALID_CONTAINER_PORT';
        throw err;
    }
    return parsed;
}

function parseEnvList(env) {
    if (env == null) {
        return [];
    }

    if (!Array.isArray(env)) {
        const err = new Error('env must be an array of { key, value } objects');
        err.statusCode = 400;
        err.errorCode = 'INVALID_ENV';
        throw err;
    }

    return env.map((item, index) => {
        const key = item?.key;
        const value = item?.value;

        if (!key || typeof key !== 'string' || !ENV_KEY_REGEX.test(key)) {
            const err = new Error(
                `env[${index}].key must be a valid environment variable name`,
            );
            err.statusCode = 400;
            err.errorCode = 'INVALID_ENV';
            throw err;
        }

        if (value == null) {
            const err = new Error(`env[${index}].value is required`);
            err.statusCode = 400;
            err.errorCode = 'INVALID_ENV';
            throw err;
        }

        return {
            name: key,
            value: String(value),
        };
    });
}

function parseResources(resources) {
    if (resources == null) {
        return null;
    }

    if (typeof resources !== 'object' || Array.isArray(resources)) {
        const err = new Error('resources must be an object');
        err.statusCode = 400;
        err.errorCode = 'INVALID_RESOURCES';
        throw err;
    }

    return resources;
}

export function generateDeploymentYaml({
    name,
    image,
    replicas = 1,
    namespace = 'default',
    env = [],
    containerPort = 3000,
    resources,
}) {
    const trimmedName = typeof name === 'string' ? name.trim() : name;
    const trimmedImage = typeof image === 'string' ? image.trim() : image;
    const trimmedNamespace = typeof namespace === 'string' ? namespace.trim() : namespace;

    assertName(trimmedName);
    assertImage(trimmedImage);
    assertNamespace(trimmedNamespace);

    const parsedReplicas = parseReplicas(replicas);
    const parsedContainerPort = parseContainerPort(containerPort);
    const envEntries = parseEnvList(env);
    const parsedResources = parseResources(resources);

    const labels = { app: trimmedName };
    const container = {
        name: trimmedName,
        image: trimmedImage,
        ports: [{ containerPort: parsedContainerPort }],
    };

    if (envEntries.length > 0) {
        container.env = envEntries;
    }

    if (parsedResources) {
        container.resources = parsedResources;
    }

    const deploymentObject = {
        apiVersion: 'apps/v1',
        kind: 'Deployment',
        metadata: {
            name: trimmedName,
            namespace: trimmedNamespace,
            labels,
        },
        spec: {
            replicas: parsedReplicas,
            selector: {
                matchLabels: labels,
            },
            template: {
                metadata: {
                    labels,
                },
                spec: {
                    containers: [container],
                },
            },
        },
    };

    return yaml.dump(deploymentObject, {
        noRefs: true,
        lineWidth: -1,
    });
}
