import previewService from '../services/preview.service.js';
import previewPolicyService from '../services/previewPolicy.service.js';
import Preview from '../models/preview.model.js';
import PreviewEvent from '../models/previewEvent.model.js';
import AppError, { NotFoundError, ValidationError } from '../utils/AppError.js';
import logger from '../utils/logger.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { standardResponse, paginatedResponse, getPagination } from '../utils/apiResponse.js';

class PreviewController {

    // --- Previews ---

    listPreviews = asyncHandler(async (req, res) => {
        const { repositoryId, status } = req.query;
        const { page, limit } = getPagination(req);
        const query = { userId: req.user._id };

        if (repositoryId) query.repositoryId = repositoryId;
        if (status) query.status = status;

        const previews = await Preview.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .populate('repositoryId', 'name slug')
            .lean();

        const total = await Preview.countDocuments(query);

        res.json(paginatedResponse(previews, page, limit, total));
    });

    getPreview = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const preview = await Preview.findOne({ _id: id, userId: req.user._id })
            .populate('repositoryId', 'name slug cloneUrl')
            .lean();

        if (!preview) throw new NotFoundError('Preview not found');

        res.json(standardResponse({ preview }));
    });

    createPreview = asyncHandler(async (req, res) => {
        const { repositoryId, branch, commitSha, prNumber, prTitle, trigger, buildFingerprint, forceBuild } = req.body;
        
        if (!repositoryId || !branch || !commitSha) {
            throw new ValidationError('repositoryId, branch, and commitSha are required');
        }

        const preview = await previewService.createPreview(req.user._id, repositoryId, {
            branch, commitSha, prNumber, prTitle, trigger, buildFingerprint, forceBuild
        });

        res.status(201).json(standardResponse({ preview }, 'Preview environment creation started'));
    });

    destroyPreview = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { reason } = req.body;

        const preview = await previewService.destroyPreview(id, req.user._id, reason);
        
        res.json(standardResponse({ preview }, 'Preview environment destroyed'));
    });

    extendPreview = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { additionalMinutes } = req.body;

        if (!additionalMinutes || isNaN(additionalMinutes) || additionalMinutes <= 0) {
            throw new ValidationError('additionalMinutes must be a positive number');
        }

        const preview = await previewService.extendPreview(id, req.user._id, Number(additionalMinutes));
        
        res.json(standardResponse({ preview }, 'Preview environment extended'));
    });

    getPreviewEvents = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { page, limit } = getPagination(req);

        // Verify access
        const preview = await Preview.findOne({ _id: id, userId: req.user._id });
        if (!preview) throw new NotFoundError('Preview not found');

        const events = await PreviewEvent.find({ previewId: id })
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();

        const total = await PreviewEvent.countDocuments({ previewId: id });

        res.json(paginatedResponse(events, page, limit, total));
    });

    // --- Policies ---

    getPolicy = asyncHandler(async (req, res) => {
        const { repoId } = req.params;
        const policy = await previewPolicyService.getPolicy(repoId, req.user._id);
        res.json(standardResponse({ policy }));
    });

    upsertPolicy = asyncHandler(async (req, res) => {
        const { repoId } = req.params;
        const policyData = req.body;
        
        const policy = await previewPolicyService.upsertPolicy(repoId, req.user._id, policyData);
        res.json(standardResponse({ policy }));
    });

}

export default new PreviewController();
