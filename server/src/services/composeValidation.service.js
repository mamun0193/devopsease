import yaml from 'js-yaml';

const FORBIDDEN_KEYS = ['cap_add', 'devices', 'extra_hosts', 'links'];

const DANGEROUS_TARGETS = ['/var/run/docker.sock', '/etc', '/root', '/proc', '/sys'];
const NAMED_VOLUME_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/;

function validateVolumeMount(volStr) {
    if (!volStr || typeof volStr !== 'string') return 'invalid volume definition';

    const parts = volStr.split(':');

    // Anonymous volume (single path, no source) — allowed
    if (parts.length === 1) return null;

    const source = parts[0];
    const target = parts.length >= 2 ? parts[1] : '';

    // Reject absolute host paths (unix + windows)
    if (source.startsWith('/')) return `absolute host path not allowed ("${source}")`;
    if (/^[a-zA-Z]:[/\\]/.test(source)) return `absolute host path not allowed ("${source}")`;

    // Reject relative path mounts
    if (source.startsWith('./') || source.startsWith('../') || source === '.' || source === '..') {
        return `relative host path not allowed ("${source}")`;
    }

    // Reject .. traversal anywhere
    if (source.includes('..')) return `path traversal not allowed ("${source}")`;

    // Reject dangerous target paths
    for (const dangerous of DANGEROUS_TARGETS) {
        if (target === dangerous || target.startsWith(dangerous + '/')) {
            return `mounting to "${dangerous}" is not allowed`;
        }
    }

    // Source must be a valid named volume identifier
    if (!NAMED_VOLUME_REGEX.test(source)) {
        return `only named volumes are allowed — "${source}" is not a valid volume name`;
    }

    return null;
}

function validateService(serviceName, serviceConfig, errors) {
    if (!serviceConfig || typeof serviceConfig !== 'object') {
        errors.push(`Service "${serviceName}": invalid service definition`);
        return;
    }

    if (serviceConfig.privileged === true) {
        errors.push(`Service "${serviceName}": privileged containers are not allowed`);
    }

    if (serviceConfig.network_mode !== undefined && serviceConfig.network_mode !== null) {
        errors.push(`Service "${serviceName}": network_mode is not allowed — the platform assigns an isolated network`);
    }

    if (serviceConfig.networks !== undefined && serviceConfig.networks !== null) {
        errors.push(`Service "${serviceName}": per-service networks configuration is not allowed — the platform manages network attachment`);
    }

    if (serviceConfig.pid === 'host') {
        errors.push(`Service "${serviceName}": pid:host is not allowed`);
    }

    if (serviceConfig.ipc === 'host') {
        errors.push(`Service "${serviceName}": ipc:host is not allowed`);
    }

    for (const key of FORBIDDEN_KEYS) {
        if (serviceConfig[key]) {
            errors.push(`Service "${serviceName}": "${key}" is not allowed`);
        }
    }

    if (Array.isArray(serviceConfig.volumes)) {
        for (const vol of serviceConfig.volumes) {
            const volStr = typeof vol === 'string' ? vol : vol?.source || '';
            const volError = validateVolumeMount(volStr);
            if (volError) {
                errors.push(`Service "${serviceName}": ${volError}`);
            }
        }
    }

    if (!serviceConfig.image) {
        errors.push(`Service "${serviceName}": "image" is required (build-from-source not supported)`);
    }
}

export function validateComposeYaml(rawYaml) {
    const errors = [];

    let parsed;
    try {
        parsed = yaml.load(rawYaml, { schema: yaml.DEFAULT_SCHEMA });
    } catch (err) {
        return { valid: false, errors: [`YAML parse error: ${err.message}`], parsedCompose: null };
    }

    if (!parsed || typeof parsed !== 'object') {
        return { valid: false, errors: ['YAML must be a valid object'], parsedCompose: null };
    }

    const services = parsed.services;
    if (!services || typeof services !== 'object' || Object.keys(services).length === 0) {
        return { valid: false, errors: ['Compose YAML must contain a "services" key with at least one service'], parsedCompose: null };
    }

    if (Object.keys(services).length > 10) {
        errors.push('Maximum 10 services per project');
    }

    if (parsed.networks !== undefined && parsed.networks !== null) {
        errors.push('Top-level "networks" configuration is not allowed — the platform manages network creation');
    }

    for (const [name, config] of Object.entries(services)) {
        validateService(name, config, errors);
    }

    if (errors.length > 0) {
        return { valid: false, errors, parsedCompose: null };
    }

    return { valid: true, errors: [], parsedCompose: parsed };
}

export default { validateComposeYaml };
