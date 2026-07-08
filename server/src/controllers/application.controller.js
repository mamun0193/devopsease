import applicationService from '../services/application.service.js';
import gatewayService from '../gateway/gateway.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { standardResponse } from '../utils/apiResponse.js';
import AppError, { ValidationError, NotFoundError } from '../utils/AppError.js';

// Ownership Guard 

async function assertApplicationOwnership(userId, applicationId) {
    const application = await applicationService.getApplicationById(applicationId);
    if (!application) {
        throw new NotFoundError('Application not found');
    }
    if (String(application.userId) !== String(userId)) {
        const err = new AppError('Not authorized to manage this application', 403);
        throw err;
    }
    return application;
}

// Handlers

export const getApplications = asyncHandler(async (req, res) => {
    const applications = await applicationService.getApplications(req.user._id);
    res.json(standardResponse({ applications }));
});

export const getApplicationById = asyncHandler(async (req, res) => {
    const application = await assertApplicationOwnership(req.user._id, req.params.id);
    res.json(standardResponse({ application }));
});

export const createApplication = asyncHandler(async (req, res) => {
    const { repositoryId, name, slug, description } = req.body;
    if (!repositoryId || !name) {
        throw new ValidationError('"repositoryId" and "name" are required');
    }

    const application = await applicationService.createApplication(req.user._id, {
        repositoryId,
        name,
        slug,
        description,
    });

    res.status(201).json(standardResponse({ application }));
});

export const updateApplication = asyncHandler(async (req, res) => {
    await assertApplicationOwnership(req.user._id, req.params.id);
    const application = await applicationService.updateApplication(req.params.id, req.body);
    res.json(standardResponse({ application }));
});

export const deleteApplication = asyncHandler(async (req, res) => {
    await assertApplicationOwnership(req.user._id, req.params.id);
    await applicationService.deleteApplication(req.params.id);
    res.json(standardResponse(null, 'Application deleted'));
});

export const getApplicationDeployments = asyncHandler(async (req, res) => {
    await assertApplicationOwnership(req.user._id, req.params.id);
    const deployments = await applicationService.getApplicationDeployments(req.params.id);
    res.json(standardResponse({ deployments }));
});

export const getApplicationDomains = asyncHandler(async (req, res) => {
    const application = await assertApplicationOwnership(req.user._id, req.params.id);
    res.json(standardResponse({
        domains: {
            default: application.defaultDomain,
            custom: application.customDomains || [],
        },
    }));
});

export const getApplicationMetrics = asyncHandler(async (req, res) => {
    await assertApplicationOwnership(req.user._id, req.params.id);
    // Use slug as metrics key since that's what the gateway records
    const application = await applicationService.getApplicationById(req.params.id);
    const metrics = gatewayService.getApplicationMetrics(application.slug);
    res.json(standardResponse({ metrics }));
});

export const getGatewayMetrics = asyncHandler(async (req, res) => {
    const metrics = gatewayService.getGlobalMetrics();
    res.json(standardResponse({ metrics }));
});
