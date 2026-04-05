import yaml from 'js-yaml';

const DNS_LABEL_REGEX = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/;
const VALID_SERVICE_TYPES = new Set(['ClusterIP', 'NodePort', 'LoadBalancer']);

function isValidDnsLabel(value) {
    return typeof value === 'string' &&
        value.length > 0 &&
        value.length <= 63 &&
        DNS_LABEL_REGEX.test(value);
}

function assertName(name) {
    if (!isValidDnsLabel(name)) {
        const err = new Error('Service name must be a valid lowercase DNS label');
        err.statusCode = 400;
        err.errorCode = 'INVALID_SERVICE_NAME';
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

function parsePort(port, fieldName) {
    const parsed = Number(port);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
        const err = new Error(`${fieldName} must be an integer between 1 and 65535`);
        err.statusCode = 400;
        err.errorCode = 'INVALID_PORT';
        throw err;
    }
    return parsed;
}

function assertServiceType(type) {
    if (!VALID_SERVICE_TYPES.has(type)) {
        const err = new Error(
            `Service type must be one of: ${[...VALID_SERVICE_TYPES].join(', ')}`,
        );
        err.statusCode = 400;
        err.errorCode = 'INVALID_SERVICE_TYPE';
        throw err;
    }
}

function parseAnnotations(annotations) {
    if (annotations == null) {
        return null;
    }

    if (typeof annotations !== 'object' || Array.isArray(annotations)) {
        const err = new Error('annotations must be a plain object of key-value strings');
        err.statusCode = 400;
        err.errorCode = 'INVALID_ANNOTATIONS';
        throw err;
    }

    return annotations;
}

/**
 * Generate a Kubernetes Service YAML manifest.
 *
 * @param {object}  opts
 * @param {string}  opts.name         - Service name (DNS-label compliant)
 * @param {string}  [opts.namespace]  - Target namespace (default: "default")
 * @param {number}  [opts.port]       - Exposed service port (default: 80)
 * @param {number}  [opts.targetPort] - Container target port (default: 3000)
 * @param {string}  [opts.type]       - Service type: ClusterIP | NodePort | LoadBalancer (default: "ClusterIP")
 * @param {object}  [opts.annotations] - Optional metadata annotations
 * @returns {string} YAML string
 */
export function generateServiceYaml({
    name,
    namespace = 'default',
    port = 80,
    targetPort = 3000,
    type = 'ClusterIP',
    annotations,
}) {
    const trimmedName = typeof name === 'string' ? name.trim() : name;
    const trimmedNamespace = typeof namespace === 'string' ? namespace.trim() : namespace;

    assertName(trimmedName);
    assertNamespace(trimmedNamespace);

    const parsedPort = parsePort(port, 'port');
    const parsedTargetPort = parsePort(targetPort, 'targetPort');
    assertServiceType(type);

    const parsedAnnotations = parseAnnotations(annotations);

    const metadata = {
        name: trimmedName,
        namespace: trimmedNamespace,
    };

    if (parsedAnnotations) {
        metadata.annotations = parsedAnnotations;
    }

    const serviceObject = {
        apiVersion: 'v1',
        kind: 'Service',
        metadata,
        spec: {
            selector: {
                app: trimmedName,
            },
            ports: [
                {
                    port: parsedPort,
                    targetPort: parsedTargetPort,
                },
            ],
            type,
        },
    };

    return yaml.dump(serviceObject, {
        noRefs: true,
        lineWidth: -1,
    });
}
