import mongoose from 'mongoose';
import ConfigEntry, { CONFIG_NAME_REGEX, ENVIRONMENT_NAME_REGEX } from '../models/configEntry.model.js';
import ConfigVersion from '../models/configVersion.model.js';
import { encrypt, decrypt } from '../utils/encryption.js';
import { getDecryptedSecretsMap } from './secret.service.js';
import logger from '../utils/logger.js';

const MAX_VALUE_LENGTH = 8192;

// Validation Helpers 

function validateObjectId(id, fieldName) {
    if (!mongoose.isValidObjectId(id)) {
        throw Object.assign(new Error(`Invalid ${fieldName}`), {
            statusCode: 400, errorCode: 'VALIDATION_ERROR',
        });
    }
}

function validateEnvironmentId(environmentId) {
    if (!mongoose.isValidObjectId(environmentId)) {
        throw Object.assign(
            new Error('Invalid environmentId. Must be a valid ObjectId'),
            { statusCode: 400, errorCode: 'INVALID_ENVIRONMENT' },
        );
    }
}

function validateName(name) {
    const trimmed = String(name || '').trim();
    if (!CONFIG_NAME_REGEX.test(trimmed)) {
        throw Object.assign(
            new Error('Config name must be a valid env var key (letters, digits, underscores)'),
            { statusCode: 400, errorCode: 'VALIDATION_ERROR' },
        );
    }
    return trimmed;
}

function validateValue(value) {
    if (value == null || value === '') {
        throw Object.assign(new Error('Config value is required'), {
            statusCode: 400, errorCode: 'VALIDATION_ERROR',
        });
    }
    const str = String(value);
    if (str.length > MAX_VALUE_LENGTH) {
        throw Object.assign(new Error(`Config value must not exceed ${MAX_VALUE_LENGTH} characters`), {
            statusCode: 400, errorCode: 'VALIDATION_ERROR',
        });
    }
    return str;
}

// Safe Response Formatting 

function toSafeEntry(entry) {
    return {
        id: entry._id,
        repositoryId: entry.repositoryId,
        environmentId: entry.environmentId,
        name: entry.name,
        type: entry.type,
        encrypted: entry.encrypted,
        description: entry.description,
        source: entry.source,
        version: entry.version,
        value: entry.type === 'secret' ? '••••••••' : (entry.value ?? '••••••••'),
        lastRotatedAt: entry.lastRotatedAt,
        lastRotatedBy: entry.lastRotatedBy,
        detection: entry.detection || null,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
    };
}

function toSafeVersion(version) {
    return {
        id: version._id,
        configEntryId: version.configEntryId,
        version: version.version,
        changedBy: version.changedBy,
        changeType: version.changeType,
        reason: version.reason,
        deploymentId: version.deploymentId,
        rollbackFromVersion: version.rollbackFromVersion,
        createdAt: version.createdAt,
    };
}

// Core CRUD 

// Create a new configuration entry.
// Encrypts the value if type === 'secret'.
export async function createEntry({ repositoryId, userId, name, value, type, environmentId, description, source, detection }) {
    validateObjectId(repositoryId, 'repositoryId');
    validateObjectId(userId, 'userId');
    validateEnvironmentId(environmentId);

    const normalizedName = validateName(name);
    const normalizedValue = validateValue(value);
    const entryType = type === 'secret' ? 'secret' : 'variable';
    const isEncrypted = entryType === 'secret';

    let storedValue;
    if (isEncrypted) {
        try {
            storedValue = encrypt(normalizedValue);
        } catch {
            throw Object.assign(new Error('Failed to encrypt config value'), {
                statusCode: 500, errorCode: 'ENCRYPTION_FAILURE',
            });
        }
    } else {
        storedValue = normalizedValue;
    }

    try {
        const created = await ConfigEntry.create({
            repositoryId,
            userId,
            name: normalizedName,
            value: storedValue,
            type: entryType,
            encrypted: isEncrypted,
            environmentId: environmentId,
            description: description || '',
            source: source || 'manual',
            version: 1,
            detection: detection || null,
        });

        // Record version 1
        await ConfigVersion.create({
            configEntryId: created._id,
            version: 1,
            encryptedValue: storedValue,
            changedBy: userId,
            changeType: 'created',
        });

        logger.info('ConfigEntry created', {
            entryId: String(created._id),
            name: normalizedName,
            type: entryType,
            environmentId: String(environmentId),
            repositoryId: String(repositoryId),
        });

        return toSafeEntry(created);
    } catch (error) {
        if (error?.code === 11000) {
            throw Object.assign(
                new Error(`Config entry "${normalizedName}" already exists in this environment`),
                { statusCode: 409, errorCode: 'DUPLICATE_CONFIG_NAME' },
            );
        }
        throw error;
    }
}

// List config entries for an application + environment.
// Optionally filter by type ('variable' or 'secret').
// Values are masked in the response.
export async function getEntries(repositoryId, environmentId, { type } = {}) {
    validateObjectId(repositoryId, 'repositoryId');

    const filter = { repositoryId };
    if (environmentId) {
        validateEnvironmentId(environmentId);
        filter.environmentId = environmentId;
    }
    if (type) {
        filter.type = type;
    }

    const entries = await ConfigEntry.find(filter)
        .sort({ name: 1 })
        .lean();

    return entries.map(toSafeEntry);
}

// Update an existing config entry's value, description, or type.
// Bumps version and creates a ConfigVersion audit record.
export async function updateEntry(userId, entryId, { value, description, reason }) {
    validateObjectId(userId, 'userId');
    validateObjectId(entryId, 'entryId');

    const existing = await ConfigEntry.findById(entryId).select('+value').lean();
    if (!existing) {
        throw Object.assign(new Error('Config entry not found'), {
            statusCode: 404, errorCode: 'NOT_FOUND',
        });
    }

    // Ownership check
    if (String(existing.userId) !== String(userId)) {
        throw Object.assign(new Error('Not authorized to update this config entry'), {
            statusCode: 403, errorCode: 'FORBIDDEN',
        });
    }

    const updates = {};
    let newStoredValue = existing.value;

    if (value != null) {
        const normalizedValue = validateValue(value);
        if (existing.encrypted) {
            try {
                newStoredValue = encrypt(normalizedValue);
            } catch {
                throw Object.assign(new Error('Failed to encrypt config value'), {
                    statusCode: 500, errorCode: 'ENCRYPTION_FAILURE',
                });
            }
        } else {
            newStoredValue = normalizedValue;
        }
        updates.value = newStoredValue;
        updates.lastRotatedAt = new Date();
        updates.lastRotatedBy = userId;
    }

    if (description != null) {
        updates.description = String(description).trim();
    }

    if (Object.keys(updates).length === 0) {
        throw Object.assign(new Error('No fields to update'), {
            statusCode: 400, errorCode: 'VALIDATION_ERROR',
        });
    }

    const newVersion = existing.version + 1;
    updates.version = newVersion;

    const updated = await ConfigEntry.findByIdAndUpdate(
        entryId,
        { $set: updates },
        { new: true, runValidators: true },
    ).lean();

    // Create version record
    await ConfigVersion.create({
        configEntryId: entryId,
        version: newVersion,
        encryptedValue: newStoredValue,
        changedBy: userId,
        changeType: value != null ? 'updated' : 'updated',
        reason: reason || null,
    });

    logger.info('ConfigEntry updated', {
        entryId: String(entryId),
        name: updated.name,
        version: newVersion,
    });

    return toSafeEntry(updated);
}

// Delete a config entry and all its version history.
export async function deleteEntry(userId, entryId) {
    validateObjectId(userId, 'userId');
    validateObjectId(entryId, 'entryId');

    const existing = await ConfigEntry.findById(entryId).lean();
    if (!existing) {
        throw Object.assign(new Error('Config entry not found'), {
            statusCode: 404, errorCode: 'NOT_FOUND',
        });
    }

    if (String(existing.userId) !== String(userId)) {
        throw Object.assign(new Error('Not authorized to delete this config entry'), {
            statusCode: 403, errorCode: 'FORBIDDEN',
        });
    }

    await ConfigEntry.findByIdAndDelete(entryId);
    await ConfigVersion.deleteMany({ configEntryId: entryId });

    logger.info('ConfigEntry deleted', {
        entryId: String(entryId),
        name: existing.name,
    });

    return { id: existing._id };
}

// Versioning 

// Get version history for a config entry (values always masked).
export async function getEntryVersions(entryId) {
    validateObjectId(entryId, 'entryId');

    const versions = await ConfigVersion.find({ configEntryId: entryId })
        .sort({ version: -1 })
        .lean();

    return versions.map(toSafeVersion);
}

// Rollback a config entry to a previous version.
export async function rollbackEntry(userId, entryId, targetVersion, { reason } = {}) {
    validateObjectId(userId, 'userId');
    validateObjectId(entryId, 'entryId');

    const existing = await ConfigEntry.findById(entryId).lean();
    if (!existing) {
        throw Object.assign(new Error('Config entry not found'), {
            statusCode: 404, errorCode: 'NOT_FOUND',
        });
    }

    if (String(existing.userId) !== String(userId)) {
        throw Object.assign(new Error('Not authorized'), {
            statusCode: 403, errorCode: 'FORBIDDEN',
        });
    }

    // Find the target version record (with its stored value)
    const targetVersionDoc = await ConfigVersion.findOne({
        configEntryId: entryId,
        version: targetVersion,
    }).select('+encryptedValue').lean();

    if (!targetVersionDoc) {
        throw Object.assign(new Error(`Version ${targetVersion} not found`), {
            statusCode: 404, errorCode: 'VERSION_NOT_FOUND',
        });
    }

    const newVersion = existing.version + 1;

    // Update the entry with the old value
    const updated = await ConfigEntry.findByIdAndUpdate(
        entryId,
        {
            $set: {
                value: targetVersionDoc.encryptedValue,
                version: newVersion,
                lastRotatedAt: new Date(),
                lastRotatedBy: userId,
            },
        },
        { new: true },
    ).lean();

    // Record the rollback
    await ConfigVersion.create({
        configEntryId: entryId,
        version: newVersion,
        encryptedValue: targetVersionDoc.encryptedValue,
        changedBy: userId,
        changeType: 'rolled_back',
        reason: reason || `Rolled back to version ${targetVersion}`,
        rollbackFromVersion: targetVersion,
    });

    logger.info('ConfigEntry rolled back', {
        entryId: String(entryId),
        name: updated.name,
        fromVersion: existing.version,
        toVersion: targetVersion,
        newVersion,
    });

    return toSafeEntry(updated);
}

// Bulk Operations 

// Bulk upsert config entries (used by scanner and import).
// Preserves existing entries, creates new ones, updates changed ones.
export async function bulkUpsert(repositoryId, userId, environmentId, entries) {
    validateObjectId(repositoryId, 'repositoryId');
    validateObjectId(userId, 'userId');
    validateEnvironmentId(environmentId);

    const results = { created: 0, updated: 0, unchanged: 0, errors: [] };

    for (const entry of entries) {
        try {
            const normalizedName = validateName(entry.name);
            const normalizedValue = validateValue(entry.value);
            const entryType = entry.type === 'secret' ? 'secret' : 'variable';
            const isEncrypted = entryType === 'secret';

            const existing = await ConfigEntry.findOne({
                repositoryId,
                environmentId: environmentId,
                name: normalizedName,
            }).select('+value').lean();

            if (existing) {
                // Check if value changed — for non-encrypted, compare directly
                // For encrypted, we can't compare (different IVs), so always update
                if (!isEncrypted && existing.value === normalizedValue) {
                    results.unchanged++;
                    continue;
                }

                await updateEntry(userId, existing._id, {
                    value: normalizedValue,
                    reason: `Bulk upsert from ${entry.source || 'import'}`,
                });
                results.updated++;
            } else {
                await createEntry({
                    repositoryId,
                    userId,
                    name: normalizedName,
                    value: normalizedValue,
                    type: entryType,
                    environmentId: environmentId,
                    description: entry.description || '',
                    source: entry.source || 'imported',
                    detection: entry.detection || null,
                });
                results.created++;
            }
        } catch (error) {
            results.errors.push({ name: entry.name, error: error.message });
        }
    }

    return results;
}

// getResolvedMap and getResolvedMapWithLegacyFallback have been removed as part of the Phase 4 Configuration Refinement sprint.
// Use configResolver.service.js directly.

export default {
    createEntry,
    getEntries,
    updateEntry,
    deleteEntry,
    getEntryVersions,
    rollbackEntry,
    bulkUpsert,
};
