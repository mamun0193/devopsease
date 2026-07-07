import BackupManifest from '../models/backupManifest.model.js';
import Restore from '../models/restore.model.js';
import PlatformEvent from '../models/platformEvent.model.js';
import backupService from '../resilience/backup.service.js';
import restorePlanner from '../resilience/restorePlanner.js';
import restoreExecutor from '../resilience/restoreExecutor.js';
import { storageService } from '../storage/storage.service.js';

class ResilienceController {

    // ─── SECURITY CENTER ──────────────────────────────────────────────────

    async getSecurityEvents(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 50;
            const skip = (page - 1) * limit;

            const filter = { 
                domain: { $in: ['AUTH', 'SECRETS', 'INFRASTRUCTURE', 'RECOVERY', 'AUDIT', 'COMPLIANCE', 'SECURITY'] }
            };

            if (req.query.severity) filter.severity = req.query.severity;
            if (req.query.domain) filter.domain = req.query.domain;
            if (req.query.userId) filter.userId = req.query.userId;

            const [events, total] = await Promise.all([
                PlatformEvent.find(filter)
                    .sort({ timestamp: -1 })
                    .skip(skip)
                    .limit(limit)
                    .populate('userId', 'name email'),
                PlatformEvent.countDocuments(filter)
            ]);

            res.json({
                data: events,
                pagination: { total, page, limit, pages: Math.ceil(total / limit) }
            });
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch security events', details: error.message });
        }
    }

    // ─── BACKUPS ──────────────────────────────────────────────────────────

    async getBackups(req, res) {
        try {
            const backups = await BackupManifest.find().sort({ createdAt: -1 });
            res.json(backups);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch backups', details: error.message });
        }
    }

    async createBackup(req, res) {
        try {
            const { tier } = req.body;
            const manifest = await backupService.createBackup(tier || 'pinned');
            res.status(201).json(manifest);
        } catch (error) {
            res.status(500).json({ error: 'Backup creation failed', details: error.message });
        }
    }

    async deleteBackup(req, res) {
        try {
            const manifest = await BackupManifest.findById(req.params.id);
            if (!manifest) return res.status(404).json({ error: 'Backup not found' });
            
            try {
                await storageService.delete(manifest.storageMetadata.key);
            } catch (e) {
                // proceed to delete manifest even if storage delete fails
            }
            await BackupManifest.deleteOne({ _id: manifest._id });
            res.json({ message: 'Backup deleted successfully' });
        } catch (error) {
            res.status(500).json({ error: 'Failed to delete backup', details: error.message });
        }
    }

    // ─── RESTORES ─────────────────────────────────────────────────────────

    async getRestores(req, res) {
        try {
            const restores = await Restore.find().sort({ startedAt: -1 }).populate('backupId');
            res.json(restores);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch restores', details: error.message });
        }
    }

    async planRestore(req, res) {
        try {
            const { backupId } = req.body;
            if (!backupId) return res.status(400).json({ error: 'backupId is required' });

            const restoreRecord = await Restore.create({
                backupId,
                status: 'PENDING',
                stage: 'PLANNING'
            });

            // Generate plan synchronously for the preview
            const { plan } = await restorePlanner.generatePlan(backupId);
            
            res.json({
                restore: restoreRecord,
                plan
            });
        } catch (error) {
            res.status(500).json({ error: 'Failed to generate restore plan', details: error.message });
        }
    }

    async executeRestore(req, res) {
        try {
            const { id } = req.params;
            
            // Fire and forget execution to avoid blocking the API
            // The executor handles state updates internally
            restoreExecutor.executeRestore(id, req.user._id).catch(console.error);
            
            res.json({ message: 'Restore execution started', restoreId: id });
        } catch (error) {
            res.status(500).json({ error: 'Failed to execute restore', details: error.message });
        }
    }
}

export default new ResilienceController();
