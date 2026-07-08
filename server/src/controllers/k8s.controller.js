import { generateDeploymentYaml } from '../services/k8sDeployment.service.js';
import { generateServiceYaml } from '../services/k8sService.service.js';
import { generateIngressYaml } from '../services/k8sIngress.service.js';
import { getSecrets } from '../services/secret.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { standardResponse } from '../utils/apiResponse.js';

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

export const generateDeploymentYamlAction = asyncHandler(async (req, res) => {
        const body = req.body ?? {};
        const environment = body.environment || 'development';

        const storedSecrets = await getSecrets(req.user._id, environment);
        const managedSecretEnv = buildManagedSecretEnvRefs(storedSecrets, environment);
        const requestEnv = Array.isArray(body.env) ? body.env : [];

        const yaml = generateDeploymentYaml({
            ...body,
            env: mergeUniqueEnvEntries([...requestEnv, ...managedSecretEnv]),
        });

    res.json(standardResponse({ yaml }));
});

export const generateServiceYamlAction = asyncHandler(async (req, res) => {
    const yaml = generateServiceYaml(req.body ?? {});
    res.json(standardResponse({ yaml }));
});

export const generateIngressYamlAction = asyncHandler(async (req, res) => {
    const yaml = generateIngressYaml(req.body ?? {});
    res.json(standardResponse({ yaml }));
});
