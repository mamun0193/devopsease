import BackupManifest from '../models/backupManifest.model.js';
import Restore from '../models/restore.model.js';
import PlatformEvent from '../models/platformEvent.model.js';
import backupService from '../resilience/backup.service.js';
import restorePlanner from '../resilience/restorePlanner.js';
import restoreExecutor from '../resilience/restoreExecutor.js';
import { storageService } from '../storage/storage.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { standardResponse, paginatedResponse, getPagination } from '../utils/apiResponse.js';
import { NotFoundError, ValidationError } from '../utils/AppError.js';

class ResilienceController {

    // ─── SECURITY CENTER ──────────────────────────────────────────────────

    getSecurityEvents = asyncHandler(async (req, res) => {
        const { page, limit } = getPagination(req);
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

        res.json(paginatedResponse(events, page, limit, total));
    });

    // ─── BACKUPS ──────────────────────────────────────────────────────────

    getBackups = asyncHandler(async (req, res) => {
        const backups = await BackupManifest.find().sort({ createdAt: -1 });
        res.json(standardResponse(backups));
    });

    createBackup = asyncHandler(async (req, res) => {
        const { tier } = req.body;
        const manifest = await backupService.createBackup(tier || 'pinned');
        res.status(201).json(standardResponse(manifest));
    });

    deleteBackup = asyncHandler(async (req, res) => {
        const manifest = await BackupManifest.findById(req.params.id);
        if (!manifest) {
            throw new NotFoundError('Backup not found');
        }
        
        try {
            await storageService.delete(manifest.storageMetadata.key);
        } catch (e) {
            // proceed to delete manifest even if storage delete fails
        }
        await BackupManifest.deleteOne({ _id: manifest._id });
        res.json(standardResponse(null, 'Backup deleted successfully'));
    });

    // ─── RESTORES ─────────────────────────────────────────────────────────

    getRestores = asyncHandler(async (req, res) => {
        const restores = await Restore.find().sort({ startedAt: -1 }).populate('backupId');
        res.json(standardResponse(restores));
    });

    planRestore = asyncHandler(async (req, res) => {
        const { backupId } = req.body;
        if (!backupId) {
            throw new ValidationError('backupId is required');
        }

        const restoreRecord = await Restore.create({
            backupId,
            status: 'PENDING',
            stage: 'PLANNING'
        });

        // Generate plan synchronously for the preview
        const { plan } = await restorePlanner.generatePlan(backupId);
        
        res.json(standardResponse({
            restore: restoreRecord,
            plan
        }));
    });

    executeRestore = asyncHandler(async (req, res) => {
        const { id } = req.params;
        
        // Fire and forget execution to avoid blocking the API
        // The executor handles state updates internally
        restoreExecutor.executeRestore(id, req.user._id).catch(console.error);
        
        res.json(standardResponse({ restoreId: id }, 'Restore execution started'));
    });
}

export default new ResilienceController();
