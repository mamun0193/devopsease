import mongoose from 'mongoose';
import Secret, { SECRET_ENVIRONMENTS, SECRET_NAME_REGEX } from '../models/secret.model.js';
import { encrypt, decrypt } from '../utils/encryption.js';

const MAX_SECRET_VALUE_LENGTH = 8192;

function validateObjectId(id, fieldName) {
    if (!mongoose.isValidObjectId(id)) {
        throw Object.assign(new Error(`Invalid ${fieldName}`), { statusCode: 400, errorCode: 'VALIDATION_ERROR' });
    }
}

function normalizeEnvironment(environment = '') {
    const normalized = String(environment).trim().toLowerCase();
    if (!SECRET_ENVIRONMENTS.includes(normalized)) {
        throw Object.assign(new Error('Invalid environment. Allowed: development, staging, production'), {
            statusCode: 400,
            errorCode: 'INVALID_ENVIRONMENT',
        });
    }
    return normalized;
}

function normalizeSecretName(name = '') {
    const normalized = String(name).trim();
    if (!SECRET_NAME_REGEX.test(normalized)) {
        throw Object.assign(new Error('Invalid secret name format'), {
            statusCode: 400,
            errorCode: 'VALIDATION_ERROR',
        });
    }
    return normalized;
}

function normalizeSecretValue(value) {
    if (value == null || value === '') {
        throw Object.assign(new Error('Secret value is required'), {
            statusCode: 400,
            errorCode: 'VALIDATION_ERROR',
        });
    }
    const stringValue = String(value);
    if (stringValue.length > MAX_SECRET_VALUE_LENGTH) {
        throw Object.assign(new Error(`Secret value must not exceed ${MAX_SECRET_VALUE_LENGTH} characters`), {
            statusCode: 400,
            errorCode: 'VALIDATION_ERROR',
        });
    }
    return stringValue;
}

function toSafeSecret(secret) {
    return {
        id: secret._id,
        name: secret.name,
        environment: secret.environment,
        value: '****',
        createdAt: secret.createdAt,
        updatedAt: secret.updatedAt,
    };
}

export async function createSecret({ userId, name, value, environment }) {
    validateObjectId(userId, 'userId');

    const normalizedName = normalizeSecretName(name);
    const normalizedEnvironment = normalizeEnvironment(environment);
    const normalizedValue = normalizeSecretValue(value);

    let encryptedValue;
    try {
        encryptedValue = encrypt(normalizedValue);
    } catch (error) {
        throw Object.assign(new Error('Failed to encrypt secret value'), {
            statusCode: 500,
            errorCode: 'ENCRYPTION_FAILURE',
        });
    }

    try {
        const created = await Secret.create({
            userId,
            name: normalizedName,
            value: encryptedValue,
            environment: normalizedEnvironment,
        });

        return toSafeSecret(created);
    } catch (error) {
        if (error?.code === 11000) {
            throw Object.assign(new Error('A secret with this name already exists in this environment'), {
                statusCode: 409,
                errorCode: 'DUPLICATE_SECRET_NAME',
            });
        }
        throw error;
    }
}

export async function getSecrets(userId, environment) {
    validateObjectId(userId, 'userId');

    const filter = { userId };
    if (environment != null && environment !== '') {
        filter.environment = normalizeEnvironment(environment);
    }

    const secrets = await Secret.find(filter)
        .sort({ createdAt: -1 })
        .select('_id name environment createdAt updatedAt')
        .lean();

    return secrets.map(toSafeSecret);
}

export async function updateSecret(userId, secretId, { name, value, environment }) {
    validateObjectId(userId, 'userId');
    validateObjectId(secretId, 'secretId');

    const existing = await Secret.findOne({ _id: secretId, userId }).lean();
    if (!existing) {
        throw Object.assign(new Error('Secret not found'), { statusCode: 404, errorCode: 'NOT_FOUND' });
    }

    const updates = {};

    if (name != null) {
        updates.name = normalizeSecretName(name);
    }

    if (environment != null) {
        updates.environment = normalizeEnvironment(environment);
    }

    if (value != null) {
        const normalizedValue = normalizeSecretValue(value);
        try {
            updates.value = encrypt(normalizedValue);
        } catch (error) {
            throw Object.assign(new Error('Failed to encrypt secret value'), {
                statusCode: 500,
                errorCode: 'ENCRYPTION_FAILURE',
            });
        }
    }

    if (Object.keys(updates).length === 0) {
        throw Object.assign(new Error('No fields to update'), {
            statusCode: 400,
            errorCode: 'VALIDATION_ERROR',
        });
    }

    try {
        const updated = await Secret.findOneAndUpdate(
            { _id: secretId, userId },
            { $set: updates },
            { new: true, runValidators: true },
        ).lean();

        if (!updated) {
            throw Object.assign(new Error('Secret not found'), { statusCode: 404, errorCode: 'NOT_FOUND' });
        }

        return toSafeSecret(updated);
    } catch (error) {
        if (error?.code === 11000) {
            throw Object.assign(new Error('A secret with this name already exists in this environment'), {
                statusCode: 409,
                errorCode: 'DUPLICATE_SECRET_NAME',
            });
        }
        throw error;
    }
}

export async function deleteSecret(userId, secretId) {
    validateObjectId(userId, 'userId');
    validateObjectId(secretId, 'secretId');

    const deleted = await Secret.findOneAndDelete({ _id: secretId, userId }).lean();
    if (!deleted) {
        throw Object.assign(new Error('Secret not found'), { statusCode: 404, errorCode: 'NOT_FOUND' });
    }

    return { id: deleted._id };
}

export async function getDecryptedSecretsMap(userId, environment) {
    validateObjectId(userId, 'userId');
    const normalizedEnvironment = normalizeEnvironment(environment);

    const secrets = await Secret.find({ userId, environment: normalizedEnvironment })
        .select('_id name +value')
        .lean();

    const secretMap = {};
    for (const secret of secrets) {
        try {
            secretMap[secret.name] = decrypt(secret.value);
        } catch {
            throw Object.assign(new Error(`Failed to decrypt secret "${secret.name}"`), {
                statusCode: 500,
                errorCode: 'ENCRYPTION_FAILURE',
            });
        }
    }

    return secretMap;
}

export default {
    createSecret,
    getSecrets,
    updateSecret,
    deleteSecret,
    getDecryptedSecretsMap,
};
