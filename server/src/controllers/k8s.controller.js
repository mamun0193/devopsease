import { generateDeploymentYaml } from '../services/k8sDeployment.service.js';
import { generateServiceYaml } from '../services/k8sService.service.js';
import { generateIngressYaml } from '../services/k8sIngress.service.js';
import { getSecrets } from '../services/secret.service.js';

function buildManagedSecretEnvRefs(secretRecords = [], environment = 'development') {
    const normalizedEnvironment = String(environment || 'development').trim().toLowerCase();
    const secretResourceName = `devopsease-managed-${normalizedEnvironment}`;

    return secretRecords.map((secret) => ({
        key: secret.name,
        valueFrom: {
            secretKeyRef: {
                name: secretResourceName,
                key: secret.name,
            },
        },
    }));
}

function mergeUniqueEnvEntries(envEntries = []) {
    const deduped = new Map();
    for (const entry of envEntries) {
        if (!entry?.key) continue;
        deduped.set(entry.key, entry);
    }
    return Array.from(deduped.values());
}

export const generateDeploymentYamlAction = async (req, res, next) => {
    try {
        const body = req.body ?? {};
        const environment = body.environment || 'development';

        const storedSecrets = await getSecrets(req.user._id, environment);
        const managedSecretEnv = buildManagedSecretEnvRefs(storedSecrets, environment);
        const requestEnv = Array.isArray(body.env) ? body.env : [];

        const yaml = generateDeploymentYaml({
            ...body,
            env: mergeUniqueEnvEntries([...requestEnv, ...managedSecretEnv]),
        });

        res.json({ yaml });
    } catch (error) {
        next(error);
    }
};

export const generateServiceYamlAction = async (req, res, next) => {
    try {
        const yaml = generateServiceYaml(req.body ?? {});
        res.json({ yaml });
    } catch (error) {
        next(error);
    }
};

export const generateIngressYamlAction = async (req, res, next) => {
    try {
        const yaml = generateIngressYaml(req.body ?? {});
        res.json({ yaml });
    } catch (error) {
        next(error);
    }
};
