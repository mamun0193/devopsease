import yaml from 'js-yaml';

const FORBIDDEN_KEYS = ['cap_add', 'devices', 'extra_hosts', 'links'];

function isAbsoluteHostPath(volumeStr) {
    const parts = volumeStr.split(':');
    if (parts.length < 2) return false;
    const hostPath = parts[0];
    if (hostPath.startsWith('/')) return true;
    if (/^[a-zA-Z]:[/\\]/.test(hostPath)) return true;
    return false;
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
            if (isAbsoluteHostPath(volStr)) {
                errors.push(`Service "${serviceName}": absolute host volume mounts are not allowed ("${volStr}")`);
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
