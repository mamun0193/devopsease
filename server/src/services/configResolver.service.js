import fs from 'fs/promises';
import path from 'path';
import ConfigEntry from '../models/configEntry.model.js';
import Environment from '../models/env.model.js';
import ConfigSnapshot, { hashValue } from '../models/configSnapshot.model.js';
import logger from '../utils/logger.js';
import { decrypt } from '../utils/encryption.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEMPLATES_DIR = path.join(__dirname, '../templates/config');

// Loads a JSON framework template (e.g. Nextjs.json)

async function loadFrameworkTemplate(frameworkName) {
    if (!frameworkName) return [];
    try {
        // Map framework names to file names, e.g., 'next.js' -> 'Nextjs.json'
        const normalized = frameworkName.replace(/[^a-zA-Z0-9]/g, '');
        const files = await fs.readdir(TEMPLATES_DIR);
        const templateFile = files.find(f => f.toLowerCase() === `${normalized.toLowerCase()}.json`);
        if (!templateFile) return [];

        const content = await fs.readFile(path.join(TEMPLATES_DIR, templateFile), 'utf8');
        const parsed = JSON.parse(content);
        return parsed.variables || [];
    } catch (err) {
        logger.warn(`Failed to load config template for framework ${frameworkName}`, { error: err.message });
        return [];
    }
}

// Resolves the inheritance chain for an environment.

async function resolveInheritanceChain(environmentId) {
    const chain = [];
    let currentId = environmentId;
    const visited = new Set();

    while (currentId) {
        if (visited.has(currentId.toString())) {
            throw new Error('Circular environment inheritance detected during resolution');
        }
        visited.add(currentId.toString());

        const env = await Environment.findById(currentId).lean();
        if (!env) {
            if (chain.length === 0) throw new Error(`Environment ${environmentId} not found`);
            break; // Ancestor not found, break chain
        }

        chain.unshift(env); // Prepend so oldest ancestor is first
        currentId = env.inheritsFrom;
    }
    return chain;
}

// Centralized Configuration Resolver.

export async function resolveConfiguration(repositoryId, environmentId, deploymentOverrides = {}, framework = null) {
    const resolvedMap = new Map();

    // Helper to merge variables into the resolved map
    const mergeVars = (vars, sourceName) => {
        for (const v of vars) {
            resolvedMap.set(v.name, {
                ...v,
                source: sourceName
            });
        }
    };

    // 1. Framework Templates
    const templateVars = await loadFrameworkTemplate(framework);
    mergeVars(templateVars.map(v => ({
        name: v.name,
        value: v.defaultValue,
        type: v.type,
        encrypted: false,
        required: v.required
    })), 'Framework Template');

    // 2. Repository Defaults
    const defaultEnv = await Environment.findOne({ repositoryId, isDefault: true }).lean();
    if (defaultEnv) {
        const defaultEntries = await ConfigEntry.find({ repositoryId, environmentId: defaultEnv._id }).select('+value').lean();
        mergeVars(defaultEntries, 'Repository Default');
    }

    // 3 & 4. Inherited Environment -> Target Environment
    const chain = await resolveInheritanceChain(environmentId);
    for (const env of chain) {
        const isTarget = env._id.toString() === environmentId.toString();
        const entries = await ConfigEntry.find({ repositoryId, environmentId: env._id }).select('+value').lean();
        
        const sourceName = isTarget ? 'Environment' : `Inherited Environment (${env.name})`;
        mergeVars(entries, sourceName);
    }

    // 5. Deployment Overrides
    for (const [key, val] of Object.entries(deploymentOverrides)) {
        if (resolvedMap.has(key)) {
            const existing = resolvedMap.get(key);
            resolvedMap.set(key, { ...existing, value: val, source: 'Deployment Override' });
        } else {
            resolvedMap.set(key, { name: key, value: val, type: 'variable', encrypted: false, source: 'Deployment Override', required: false });
        }
    }

    // Transform resolved map back into array
    const resolvedConfig = Array.from(resolvedMap.values());
    
    // Validate
    const validationErrors = validateConfiguration(resolvedConfig);
    if (validationErrors.length > 0) {
        const error = new Error('Configuration validation failed');
        error.details = validationErrors;
        throw error;
    }

    return resolvedConfig;
}

// Validates a resolved configuration array.

export function validateConfiguration(resolvedConfig) {
    const errors = [];
    const keys = new Set();

    for (const entry of resolvedConfig) {
        // Check missing required
        if (entry.required && (!entry.value || entry.value.trim() === '')) {
            errors.push({ name: entry.name, error: 'Missing required configuration value' });
        }

        // Check duplicate keys (should theoretically be prevented by Map, but good to double check)
        if (keys.has(entry.name)) {
            errors.push({ name: entry.name, error: 'Duplicate key detected in resolved configuration' });
        }
        keys.add(entry.name);
    }

    return errors;
}

// Generates an immutable snapshot of a resolved configuration.

export async function createConfigSnapshot({ deploymentId, repositoryId, environmentId, resolvedConfig, generatedBy }) {
    const snapshotEntries = await Promise.all(resolvedConfig.map(async (entry) => {
        const valueToHash = entry.encrypted ? decrypt(entry.value) : entry.value;
        const hashed = hashValue(valueToHash);

        return {
            name: entry.name,
            type: entry.type,
            version: entry.version || 1,
            valueHash: hashed,
            encrypted: entry.encrypted || false,
            source: entry.source
        };
    }));

    const snapshot = new ConfigSnapshot({
        deploymentId,
        repositoryId,
        environmentId,
        entries: snapshotEntries,
        generatedBy
    });

    await snapshot.save();
    return snapshot;
}

export default { resolveConfiguration, validateConfiguration, createConfigSnapshot, resolveInheritanceChain };
