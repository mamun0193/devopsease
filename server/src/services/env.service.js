import mongoose from 'mongoose';
import Environment, { ENVIRONMENT_SLUG_REGEX } from '../models/env.model.js';

const DEFAULT_ENVIRONMENTS = ['development', 'staging', 'production'];
const MAX_ENV_VARIABLE_KEYS = 50;

function normalizeName(name = '') {
    return String(name).trim().toLowerCase();
}

function isValidVariables(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function buildVariablesObject(variables = {}) {
    if (!isValidVariables(variables)) {
        throw Object.assign(new Error('Environment variables must be a key-value object'), { statusCode: 400 });
    }

    const keys = Object.keys(variables);
    if (keys.length > MAX_ENV_VARIABLE_KEYS) {
        throw Object.assign(
            new Error(`Environment variables cannot exceed ${MAX_ENV_VARIABLE_KEYS} keys`),
            { statusCode: 400 }
        );
    }

    const normalized = {};
    for (const [key, rawValue] of Object.entries(variables)) {
        const cleanKey = String(key).trim();
        if (!cleanKey) continue;
        normalized[cleanKey] = String(rawValue ?? '');
    }
    return normalized;
}

function validateObjectId(id, fieldName) {
    if (!mongoose.isValidObjectId(id)) {
        throw Object.assign(new Error(`Invalid ${fieldName}`), { statusCode: 400 });
    }
}

function validateName(name) {
    const normalized = normalizeName(name);
    if (!ENVIRONMENT_SLUG_REGEX.test(normalized)) {
        throw Object.assign(new Error('Invalid environment name'), { statusCode: 400 });
    }
    return normalized;
}

export async function ensureDefaultEnvironments(repoId) {
    validateObjectId(repoId, 'repoId');

    const operations = DEFAULT_ENVIRONMENTS.map((name) => ({
        updateOne: {
            filter: { repoId, name },
            update: { $setOnInsert: { repoId, name, variables: {} } },
            upsert: true
        }
    }));

    await Environment.bulkWrite(operations, { ordered: false });
}

export async function assertEnvironmentExists(repoId, environmentName = 'development') {
    validateObjectId(repoId, 'repoId');
    const normalizedName = validateName(environmentName);

    await ensureDefaultEnvironments(repoId);

    const environment = await Environment.findOne({ repoId, name: normalizedName }).lean();
    if (!environment) {
        throw Object.assign(new Error(`Environment "${normalizedName}" not found for repository`), { statusCode: 400 });
    }

    return normalizedName;
}

export async function createEnvironment(repoId, name, variables = {}) {
    validateObjectId(repoId, 'repoId');
    const normalizedName = validateName(name);
    const normalizedVariables = buildVariablesObject(variables);

    const exists = await Environment.findOne({ repoId, name: normalizedName }).lean();
    if (exists) {
        throw Object.assign(new Error(`Environment "${normalizedName}" already exists`), { statusCode: 409 });
    }

    try {
        return await Environment.create({
            repoId,
            name: normalizedName,
            variables: normalizedVariables
        });
    } catch (error) {
        if (error?.code === 11000) {
            throw Object.assign(new Error(`Environment "${normalizedName}" already exists`), { statusCode: 409 });
        }
        throw error;
    }
}

export async function getEnvironments(repoId) {
    validateObjectId(repoId, 'repoId');

    await ensureDefaultEnvironments(repoId);

    return Environment.find({ repoId })
        .sort({ name: 1 })
        .lean();
}

export async function deleteEnvironment(envId) {
    validateObjectId(envId, 'envId');

    const env = await Environment.findById(envId).lean();
    if (!env) {
        throw Object.assign(new Error('Environment not found'), { statusCode: 404 });
    }

    if (DEFAULT_ENVIRONMENTS.includes(env.name)) {
        throw Object.assign(new Error(`Cannot delete default environment "${env.name}"`), { statusCode: 400 });
    }

    const deleted = await Environment.findByIdAndDelete(envId);

    return deleted;
}
