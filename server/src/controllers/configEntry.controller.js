import mongoose from 'mongoose';
import {
    createEntry,
    getEntries,
    updateEntry,
    deleteEntry,
    getEntryVersions,
    rollbackEntry,
    bulkUpsert,
} from '../services/configEntry.service.js';
import { importConfig, exportConfig } from '../services/configImportExport.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { standardResponse } from '../utils/apiResponse.js';
import { ValidationError } from '../utils/AppError.js';

// ConfigEntry Controller — Application-centric configuration management.

export const createConfigEntry = asyncHandler(async (req, res) => {
    const { repositoryId, name, value, type, environmentId, description, source } = req.body;
    const userId = req.user._id;

    if (!repositoryId || !name || value == null || !environmentId) {
        throw new ValidationError('repositoryId, name, value, and environmentId are required');
    }

    const entry = await createEntry({
        repositoryId,
        userId,
        name,
        value,
        type: type || 'variable',
        environmentId,
        description: description || '',
        source: source || 'manual',
    });

    res.status(201).json(standardResponse({ entry }));
});

export const listConfigEntries = asyncHandler(async (req, res) => {
    const { repositoryId, environmentId, type } = req.query;

    if (!repositoryId) {
        throw new ValidationError('repositoryId query parameter is required');
    }

    const entries = await getEntries(repositoryId, environmentId || undefined, {
        type: type || undefined,
    });

    res.json(standardResponse({ entries }));
});

export const updateConfigEntry = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user._id;
    const { value, description, reason } = req.body;

    const entry = await updateEntry(userId, id, { value, description, reason });

    res.json(standardResponse({ entry }));
});

export const deleteConfigEntry = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user._id;

    const result = await deleteEntry(userId, id);

    res.json(standardResponse({ ...result }, 'Config entry deleted'));
});

export const getVersionHistory = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const versions = await getEntryVersions(id);

    res.json(standardResponse({ versions }));
});

export const rollbackConfigEntry = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user._id;
    const { targetVersion, reason } = req.body;

    if (!targetVersion) {
        throw new ValidationError('targetVersion is required');
    }

    const entry = await rollbackEntry(userId, id, targetVersion, { reason });

    res.json(standardResponse({ entry }));
});

export const bulkUpsertEntries = asyncHandler(async (req, res) => {
    const { repositoryId, environmentId, entries: entryList } = req.body;
    const userId = req.user._id;

    if (!repositoryId || !environmentId || !Array.isArray(entryList)) {
        throw new ValidationError('repositoryId, environmentId, and entries[] are required');
    }

    const result = await bulkUpsert(repositoryId, userId, environmentId, entryList);

    res.json(standardResponse({ result }));
});

export const importConfigEntries = asyncHandler(async (req, res) => {
    const { repositoryId, environmentId, content, format } = req.body;
    const userId = req.user._id;

    if (!repositoryId || !environmentId || !content) {
        throw new ValidationError('repositoryId, environmentId, and content are required');
    }

    const result = await importConfig(content, format || 'auto', repositoryId, environmentId, userId);

    res.json(standardResponse({ result }));
});

export const exportConfigEntries = asyncHandler(async (req, res) => {
    const { format } = req.params;
    const { repositoryId, environmentId, name, namespace } = req.query;
    const userId = req.user._id;

    if (!repositoryId || !environmentId) {
        throw new ValidationError('repositoryId and environmentId query parameters are required');
    }

    const { content, contentType } = await exportConfig(
        repositoryId, userId, environmentId, format, { name, namespace },
    );

    res.setHeader('Content-Type', contentType);
    res.send(content);
});
