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

// ConfigEntry Controller — Application-centric configuration management.

 

export const createConfigEntry = async (req, res, next) => {
    try {
        const { repositoryId, name, value, type, environmentId, description, source } = req.body;
        const userId = req.user._id;

        if (!repositoryId || !name || value == null || !environmentId) {
            return res.status(400).json({
                message: 'repositoryId, name, value, and environmentId are required',
            });
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

        res.status(201).json({ entry });
    } catch (error) {
        next(error);
    }
};

export const listConfigEntries = async (req, res, next) => {
    try {
        const { repositoryId, environmentId, type } = req.query;

        if (!repositoryId) {
            return res.status(400).json({ message: 'repositoryId query parameter is required' });
        }

        const entries = await getEntries(repositoryId, environmentId || undefined, {
            type: type || undefined,
        });

        res.json({ entries });
    } catch (error) {
        next(error);
    }
};

export const updateConfigEntry = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;
        const { value, description, reason } = req.body;

        const entry = await updateEntry(userId, id, { value, description, reason });

        res.json({ entry });
    } catch (error) {
        next(error);
    }
};

export const deleteConfigEntry = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        const result = await deleteEntry(userId, id);

        res.json({ message: 'Config entry deleted', ...result });
    } catch (error) {
        next(error);
    }
};

export const getVersionHistory = async (req, res, next) => {
    try {
        const { id } = req.params;

        const versions = await getEntryVersions(id);

        res.json({ versions });
    } catch (error) {
        next(error);
    }
};

export const rollbackConfigEntry = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;
        const { targetVersion, reason } = req.body;

        if (!targetVersion) {
            return res.status(400).json({ message: 'targetVersion is required' });
        }

        const entry = await rollbackEntry(userId, id, targetVersion, { reason });

        res.json({ entry });
    } catch (error) {
        next(error);
    }
};

export const bulkUpsertEntries = async (req, res, next) => {
    try {
        const { repositoryId, environmentId, entries: entryList } = req.body;
        const userId = req.user._id;

        if (!repositoryId || !environmentId || !Array.isArray(entryList)) {
            return res.status(400).json({
                message: 'repositoryId, environmentId, and entries[] are required',
            });
        }

        const result = await bulkUpsert(repositoryId, userId, environmentId, entryList);

        res.json({ result });
    } catch (error) {
        next(error);
    }
};

export const importConfigEntries = async (req, res, next) => {
    try {
        const { repositoryId, environmentId, content, format } = req.body;
        const userId = req.user._id;

        if (!repositoryId || !environmentId || !content) {
            return res.status(400).json({
                message: 'repositoryId, environmentId, and content are required',
            });
        }

        const result = await importConfig(content, format || 'auto', repositoryId, environmentId, userId);

        res.json({ result });
    } catch (error) {
        next(error);
    }
};

export const exportConfigEntries = async (req, res, next) => {
    try {
        const { format } = req.params;
        const { repositoryId, environmentId, name, namespace } = req.query;
        const userId = req.user._id;

        if (!repositoryId || !environmentId) {
            return res.status(400).json({
                message: 'repositoryId and environmentId query parameters are required',
            });
        }

        const { content, contentType } = await exportConfig(
            repositoryId, userId, environmentId, format, { name, namespace },
        );

        res.setHeader('Content-Type', contentType);
        res.send(content);
    } catch (error) {
        next(error);
    }
};
