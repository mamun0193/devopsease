import yaml from 'js-yaml';

const DNS_LABEL_REGEX = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/;
const DOMAIN_REGEX = /^([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;

function isValidDnsLabel(value) {
    return typeof value === 'string' &&
        value.length > 0 &&
        value.length <= 63 &&
        DNS_LABEL_REGEX.test(value);
}

function assertName(name) {
    if (!isValidDnsLabel(name)) {
        const err = new Error('Ingress name must be a valid lowercase DNS label');
        err.statusCode = 400;
        err.errorCode = 'INVALID_INGRESS_NAME';
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

function assertHost(host) {
    if (!host || typeof host !== 'string' || host.trim().length === 0) {
        const err = new Error('host is required and must be a valid domain name');
        err.statusCode = 400;
        err.errorCode = 'INVALID_HOST';
        throw err;
    }

    const trimmed = host.trim();
    if (!DOMAIN_REGEX.test(trimmed)) {
        const err = new Error(
            'host must be a valid domain name (e.g. app.example.com)',
        );
        err.statusCode = 400;
        err.errorCode = 'INVALID_HOST';
        throw err;
    }
}

function assertServiceName(serviceName) {
    if (!isValidDnsLabel(serviceName)) {
        const err = new Error('serviceName must be a valid lowercase DNS label');
        err.statusCode = 400;
        err.errorCode = 'INVALID_SERVICE_NAME';
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

function assertPath(path) {
    if (typeof path !== 'string' || path.trim().length === 0) {
        const err = new Error('path must be a non-empty string');
        err.statusCode = 400;
        err.errorCode = 'INVALID_PATH';
        throw err;
    }

    if (!path.startsWith('/')) {
        const err = new Error('path must start with /');
        err.statusCode = 400;
        err.errorCode = 'INVALID_PATH';
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
 * Generate a Kubernetes Ingress YAML manifest.
 *
 * @param {object}  opts
 * @param {string}  opts.name          - Ingress name (DNS-label compliant)
 * @param {string}  [opts.namespace]   - Target namespace (default: "default")
 * @param {string}  opts.host          - FQDN host (e.g. "app.example.com")
 * @param {string}  opts.serviceName   - Backend Service name
 * @param {number}  [opts.servicePort] - Backend Service port (default: 80)
 * @param {string}  [opts.path]        - URL path (default: "/")
 * @param {object}  [opts.annotations] - Optional metadata annotations
 * @returns {string} YAML string
 */
export function generateIngressYaml({
    name,
    namespace = 'default',
    host,
    serviceName,
    servicePort = 80,
    path = '/',
    annotations,
}) {
    const trimmedName = typeof name === 'string' ? name.trim() : name;
    const trimmedNamespace = typeof namespace === 'string' ? namespace.trim() : namespace;
    const trimmedHost = typeof host === 'string' ? host.trim() : host;
    const trimmedServiceName = typeof serviceName === 'string' ? serviceName.trim() : serviceName;
    const trimmedPath = typeof path === 'string' ? path.trim() : path;

    assertName(trimmedName);
    assertNamespace(trimmedNamespace);
    assertHost(trimmedHost);
    assertServiceName(trimmedServiceName);
    assertPath(trimmedPath);

    const parsedServicePort = parsePort(servicePort, 'servicePort');
    const parsedAnnotations = parseAnnotations(annotations);

    const metadata = {
        name: trimmedName,
        namespace: trimmedNamespace,
    };

    if (parsedAnnotations) {
        metadata.annotations = parsedAnnotations;
    }

    const ingressObject = {
        apiVersion: 'networking.k8s.io/v1',
        kind: 'Ingress',
        metadata,
        spec: {
            rules: [
                {
                    host: trimmedHost,
                    http: {
                        paths: [
                            {
                                path: trimmedPath,
                                pathType: 'Prefix',
                                backend: {
                                    service: {
                                        name: trimmedServiceName,
                                        port: {
                                            number: parsedServicePort,
                                        },
                                    },
                                },
                            },
                        ],
                    },
                },
            ],
        },
    };

    return yaml.dump(ingressObject, {
        noRefs: true,
        lineWidth: -1,
    });
}
