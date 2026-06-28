import logger from '../utils/logger.js';
import { decrypt } from '../utils/encryption.js';

/**
 * Configuration Adapter Service
 * 
 * Converts a unified `ResolvedConfiguration` array into provider-specific
 * structures for the Deployment Engine (Docker, Kubernetes, Compose, etc).
 * Automatically handles decryption for secrets when injecting into the runtime.
 */

async function decryptConfiguration(resolvedConfig) {
    const decryptedConfig = [];

    for (const entry of resolvedConfig) {
        if (entry.encrypted && entry.type === 'secret') {
            try {
                const plaintext = decrypt(entry.value);
                decryptedConfig.push({ ...entry, value: plaintext });
            } catch (err) {
                logger.error(`Failed to decrypt secret ${entry.name}`, { error: err.message });
                throw new Error(`Failed to decrypt secret ${entry.name} during deployment injection`);
            }
        } else {
            decryptedConfig.push(entry);
        }
    }
    
    return decryptedConfig;
}

export async function adaptForDocker(resolvedConfig) {
    const decryptedConfig = await decryptConfiguration(resolvedConfig);
    const envObj = {};
    for (const entry of decryptedConfig) {
        envObj[entry.name] = entry.value;
    }
    return envObj; // Dockerode expects { KEY: "value" }
}

export async function adaptForKubernetes(resolvedConfig, deploymentName) {
    const decryptedConfig = await decryptConfiguration(resolvedConfig);
    
    const configMapData = {};
    const secretData = {};

    for (const entry of decryptedConfig) {
        if (entry.type === 'secret') {
            secretData[entry.name] = Buffer.from(entry.value).toString('base64');
        } else {
            configMapData[entry.name] = entry.value;
        }
    }

    return {
        configMap: {
            apiVersion: 'v1',
            kind: 'ConfigMap',
            metadata: { name: `${deploymentName}-config` },
            data: configMapData
        },
        secret: {
            apiVersion: 'v1',
            kind: 'Secret',
            metadata: { name: `${deploymentName}-secrets` },
            type: 'Opaque',
            data: secretData
        },
        envRefs: [
            { configMapRef: { name: `${deploymentName}-config` } },
            { secretRef: { name: `${deploymentName}-secrets` } }
        ]
    };
}

export async function adaptForCompose(resolvedConfig) {
    const decryptedConfig = await decryptConfiguration(resolvedConfig);
    const envList = [];
    for (const entry of decryptedConfig) {
        envList.push(`${entry.name}=${entry.value}`);
    }
    return envList; // Docker Compose array format: ["KEY=value"]
}

// Provider Readiness Check
// Evaluates whether the resolved configuration is ready for a specific provider.
 
export function checkProviderReadiness(resolvedConfig, provider) {
    const readiness = {
        ready: true,
        warnings: [],
        errors: []
    };

    // Global requirements
    const missing = resolvedConfig.filter(e => e.required && (!e.value || e.value.trim() === ''));
    if (missing.length > 0) {
        readiness.ready = false;
        readiness.errors.push(`Missing required variables: ${missing.map(m => m.name).join(', ')}`);
    }

    // Provider-specific readiness
    if (provider === 'kubernetes') {
        const invalidK8sNames = resolvedConfig.filter(e => !/^[A-Za-z0-9_.-]+$/.test(e.name));
        if (invalidK8sNames.length > 0) {
            readiness.ready = false;
            readiness.errors.push(`Invalid variable names for Kubernetes ConfigMap: ${invalidK8sNames.map(m => m.name).join(', ')}`);
        }
    }

    if (provider === 'docker') {
        // Docker doesn't support massive environment variables well, warn if total size > 128KB
        const totalSize = resolvedConfig.reduce((acc, e) => acc + e.name.length + e.value.length, 0);
        if (totalSize > 128 * 1024) {
            readiness.warnings.push('Total environment variable size exceeds 128KB, which may cause Docker injection issues.');
        }
    }

    return readiness;
}

export default { adaptForDocker, adaptForKubernetes, adaptForCompose, checkProviderReadiness };
