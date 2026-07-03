import previewService from '../services/preview.service.js';
import previewPolicyService from '../services/previewPolicy.service.js';
import Preview from '../models/preview.model.js';
import PreviewEvent from '../models/previewEvent.model.js';
import AppError from '../utils/AppError.js';
import logger from '../utils/logger.js';

class PreviewController {

    // --- Previews ---

    async listPreviews(req, res, next) {
        try {
            const { repositoryId, status, page = 1, limit = 20 } = req.query;
            const query = { userId: req.user._id };

            if (repositoryId) query.repositoryId = repositoryId;
            if (status) query.status = status;

            const previews = await Preview.find(query)
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(Number(limit))
                .populate('repositoryId', 'name slug')
                .lean();

            const total = await Preview.countDocuments(query);

            res.json({
                previews,
                pagination: {
                    total,
                    page: Number(page),
                    pages: Math.ceil(total / limit)
                }
            });
        } catch (err) {
            next(err);
        }
    }

    async getPreview(req, res, next) {
        try {
            const { id } = req.params;
            const preview = await Preview.findOne({ _id: id, userId: req.user._id })
                .populate('repositoryId', 'name slug cloneUrl')
                .lean();

            if (!preview) throw new AppError('Preview not found', 404);

            res.json({ preview });
        } catch (err) {
            next(err);
        }
    }

    async createPreview(req, res, next) {
        try {
            const { repositoryId, branch, commitSha, prNumber, prTitle, trigger, buildFingerprint, forceBuild } = req.body;
            
            if (!repositoryId || !branch || !commitSha) {
                throw new AppError('repositoryId, branch, and commitSha are required', 400);
            }

            const preview = await previewService.createPreview(req.user._id, repositoryId, {
                branch, commitSha, prNumber, prTitle, trigger, buildFingerprint, forceBuild
            });

            res.status(201).json({
                message: 'Preview environment creation started',
                preview
            });
        } catch (err) {
            next(err);
        }
    }

    async destroyPreview(req, res, next) {
        try {
            const { id } = req.params;
            const { reason } = req.body;

            const preview = await previewService.destroyPreview(id, req.user._id, reason);
            
            res.json({
                message: 'Preview environment destroyed',
                preview
            });
        } catch (err) {
            next(err);
        }
    }

    async extendPreview(req, res, next) {
        try {
            const { id } = req.params;
            const { additionalMinutes } = req.body;

            if (!additionalMinutes || isNaN(additionalMinutes) || additionalMinutes <= 0) {
                throw new AppError('additionalMinutes must be a positive number', 400);
            }

            const preview = await previewService.extendPreview(id, req.user._id, Number(additionalMinutes));
            
            res.json({
                message: 'Preview environment extended',
                preview
            });
        } catch (err) {
            next(err);
        }
    }

    async getPreviewEvents(req, res, next) {
        try {
            const { id } = req.params;
            const { page = 1, limit = 50 } = req.query;

            // Verify access
            const preview = await Preview.findOne({ _id: id, userId: req.user._id });
            if (!preview) throw new AppError('Preview not found', 404);

            const events = await PreviewEvent.find({ previewId: id })
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(Number(limit))
                .lean();

            const total = await PreviewEvent.countDocuments({ previewId: id });

            res.json({
                events,
                pagination: {
                    total,
                    page: Number(page),
                    pages: Math.ceil(total / limit)
                }
            });
        } catch (err) {
            next(err);
        }
    }

    // --- Policies ---

    async getPolicy(req, res, next) {
        try {
            const { repoId } = req.params;
            const policy = await previewPolicyService.getPolicy(repoId, req.user._id);
            res.json({ policy });
        } catch (err) {
            next(err);
        }
    }

    async upsertPolicy(req, res, next) {
        try {
            const { repoId } = req.params;
            const policyData = req.body;
            
            const policy = await previewPolicyService.upsertPolicy(repoId, req.user._id, policyData);
            res.json({ policy });
        } catch (err) {
            next(err);
        }
    }

}

export default new PreviewController();
