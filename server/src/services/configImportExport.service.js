import { bulkUpsert } from './configEntry.service.js';
import { resolveConfiguration, toEnvFile, toK8sSecretYaml, toK8sConfigMapYaml } from './runtimeInjection.service.js';
import logger from '../utils/logger.js';

// Configuration Import / Export Service

// Importers: Parse external formats and bulk-upsert into ConfigEntry.
// Exporters: Produce external formats from resolved configuration.


// Secret Classification (shared with envScanner) 

const SECRET_PATTERNS = [
    'PASSWORD', 'SECRET', 'TOKEN', 'PRIVATE_KEY', 'ACCESS_KEY', 'API_KEY',
    'CREDENTIAL', 'AUTH', 'DSN', 'DATABASE_URL', 'REDIS_URL', 'MONGO_URI',
    'CONNECTION_STRING', 'CERTIFICATE', 'SMTP',
];

function classifyAsSecret(name) {
    const upper = name.toUpperCase();
    return SECRET_PATTERNS.some(p => upper.includes(p));
}

// Importers 

// Parse a .env file string into key-value entries.
// Supports comments (#), empty lines, quoted values, multiline NOT supported.
function parseEnvContent(content) {
    const entries = [];
    const lines = content.split('\n');

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;

        const eqIndex = trimmed.indexOf('=');
        if (eqIndex === -1) continue;

        const name = trimmed.substring(0, eqIndex).trim();
        let value = trimmed.substring(eqIndex + 1).trim();

        // Remove surrounding quotes
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }

        if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
            entries.push({ name, value });
        }
    }

    return entries;
}

// Import from .env file content.
export async function importFromEnvFile(content, applicationId, environment, userId) {
    const parsed = parseEnvContent(content);
    const entries = parsed.map(({ name, value }) => ({
        name,
        value,
        type: classifyAsSecret(name) ? 'secret' : 'variable',
        source: 'imported',
        description: '',
    }));

    const result = await bulkUpsert(applicationId, userId, environment, entries);

    logger.info('Config imported from .env file', {
        applicationId: String(applicationId),
        environment,
        ...result,
    });

    return result;
}

// Import from JSON object content.
// Expected format: { "KEY": "value", "KEY2": "value2" }
export async function importFromJson(content, applicationId, environment, userId) {
    let parsed;
    try {
        parsed = JSON.parse(content);
    } catch {
        throw Object.assign(new Error('Invalid JSON content'), {
            statusCode: 400, errorCode: 'INVALID_FORMAT',
        });
    }

    if (typeof parsed !== 'object' || Array.isArray(parsed) || parsed === null) {
        throw Object.assign(new Error('JSON must be a key-value object'), {
            statusCode: 400, errorCode: 'INVALID_FORMAT',
        });
    }

    const entries = Object.entries(parsed).map(([name, value]) => ({
        name,
        value: String(value),
        type: classifyAsSecret(name) ? 'secret' : 'variable',
        source: 'imported',
        description: '',
    }));

    const result = await bulkUpsert(applicationId, userId, environment, entries);

    logger.info('Config imported from JSON', {
        applicationId: String(applicationId),
        environment,
        ...result,
    });

    return result;
}

// Import from YAML content.
// Expected format (flat key-value):
//   KEY: value
//   KEY2: value2
export async function importFromYaml(content, applicationId, environment, userId) {
    // Simple flat-YAML parser (no nested objects)
    const entries = [];
    const lines = content.split('\n');

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;

        const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$/);
        if (match) {
            let value = match[2].trim();
            // Remove quotes
            if ((value.startsWith('"') && value.endsWith('"')) ||
                (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
            }

            entries.push({
                name: match[1],
                value,
                type: classifyAsSecret(match[1]) ? 'secret' : 'variable',
                source: 'imported',
                description: '',
            });
        }
    }

    const result = await bulkUpsert(applicationId, userId, environment, entries);

    logger.info('Config imported from YAML', {
        applicationId: String(applicationId),
        environment,
        ...result,
    });

    return result;
}

// Auto-detect format and import.
export async function importConfig(content, format, applicationId, environment, userId) {
    switch (format) {
        case 'env':
        case 'dotenv':
            return importFromEnvFile(content, applicationId, environment, userId);
        case 'json':
            return importFromJson(content, applicationId, environment, userId);
        case 'yaml':
        case 'yml':
            return importFromYaml(content, applicationId, environment, userId);
        default:
            // Auto-detect: if it starts with '{', try JSON; else treat as .env
            if (content.trim().startsWith('{')) {
                return importFromJson(content, applicationId, environment, userId);
            }
            return importFromEnvFile(content, applicationId, environment, userId);
    }
}

//  Exporters 

// Export as .env file string (secrets masked by default).
export async function exportAsEnvFile(applicationId, userId, environment, { unmask = false } = {}) {
    const resolved = await resolveConfiguration(applicationId, userId, environment);

    if (!unmask) {
        // Mask secrets
        for (const key of Object.keys(resolved.secrets)) {
            resolved.secrets[key] = '••••••••';
        }
    }

    return toEnvFile(resolved);
}

// Export as Docker Compose env_file format (same as .env but labeled for compose).
export async function exportAsComposeEnvFile(applicationId, userId, environment, { unmask = false } = {}) {
    // Same format as .env, just different labeling
    return exportAsEnvFile(applicationId, userId, environment, { unmask });
}

// Export as Kubernetes Secret YAML.
export async function exportAsK8sSecret(applicationId, userId, environment, name, namespace) {
    const resolved = await resolveConfiguration(applicationId, userId, environment);
    return toK8sSecretYaml(name, namespace, resolved);
}

// Export as Kubernetes ConfigMap YAML.
export async function exportAsK8sConfigMap(applicationId, userId, environment, name, namespace) {
    const resolved = await resolveConfiguration(applicationId, userId, environment);
    return toK8sConfigMapYaml(name, namespace, resolved);
}

// Export as GitHub Actions secrets template.
// Outputs the variable names as a checklist (values are never exported for GH Actions).
export async function exportAsGitHubActionsTemplate(applicationId, userId, environment) {
    const resolved = await resolveConfiguration(applicationId, userId, environment);

    const lines = [
        '# GitHub Actions Secrets Template',
        `# Application: ${resolved.metadata.applicationSlug || 'unknown'}`,
        `# Environment: ${resolved.metadata.environment}`,
        `# Generated: ${resolved.metadata.resolvedAt}`,
        '',
        '# Add these secrets in your repository Settings → Secrets and variables → Actions',
        '',
    ];

    if (Object.keys(resolved.secrets).length > 0) {
        lines.push('# Secrets (add as Repository Secrets):');
        for (const key of Object.keys(resolved.secrets)) {
            lines.push(`# - ${key}`);
        }
        lines.push('');
    }

    if (Object.keys(resolved.variables).length > 0) {
        lines.push('# Variables (add as Repository Variables):');
        for (const [key, value] of Object.entries(resolved.variables)) {
            lines.push(`# - ${key}=${value}`);
        }
    }

    return lines.join('\n') + '\n';
}

// Export config in the requested format.
export async function exportConfig(applicationId, userId, environment, format, options = {}) {
    switch (format) {
        case 'env':
        case 'dotenv':
            return { content: await exportAsEnvFile(applicationId, userId, environment, options), contentType: 'text/plain' };
        case 'compose':
            return { content: await exportAsComposeEnvFile(applicationId, userId, environment, options), contentType: 'text/plain' };
        case 'k8s-secret':
            return { content: await exportAsK8sSecret(applicationId, userId, environment, options.name || 'app-secrets', options.namespace || 'default'), contentType: 'text/yaml' };
        case 'k8s-configmap':
            return { content: await exportAsK8sConfigMap(applicationId, userId, environment, options.name || 'app-config', options.namespace || 'default'), contentType: 'text/yaml' };
        case 'github-actions':
            return { content: await exportAsGitHubActionsTemplate(applicationId, userId, environment), contentType: 'text/plain' };
        default:
            throw Object.assign(new Error(`Unsupported export format: ${format}`), {
                statusCode: 400, errorCode: 'INVALID_FORMAT',
            });
    }
}

export default {
    importConfig,
    importFromEnvFile,
    importFromJson,
    importFromYaml,
    exportConfig,
    exportAsEnvFile,
    exportAsComposeEnvFile,
    exportAsK8sSecret,
    exportAsK8sConfigMap,
    exportAsGitHubActionsTemplate,
};
