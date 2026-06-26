import applicationService from '../services/application.service.js';
import gatewayService from '../gateway/gateway.service.js';

// Ownership Guard 

async function assertApplicationOwnership(userId, applicationId) {
    const application = await applicationService.getApplicationById(applicationId);
    if (!application) {
        const err = new Error('Application not found');
        err.statusCode = 404;
        throw err;
    }
    if (String(application.userId) !== String(userId)) {
        const err = new Error('Not authorized to manage this application');
        err.statusCode = 403;
        throw err;
    }
    return application;
}

//  Handlers 

export const getApplications = async (req, res, next) => {
    try {
        const applications = await applicationService.getApplications(req.user._id);
        res.json({ applications });
    } catch (error) {
        next(error);
    }
};

export const getApplicationById = async (req, res, next) => {
    try {
        const application = await assertApplicationOwnership(req.user._id, req.params.id);
        res.json({ application });
    } catch (error) {
        next(error);
    }
};

export const createApplication = async (req, res, next) => {
    try {
        const { repositoryId, name, slug, description } = req.body;
        if (!repositoryId || !name) {
            const err = new Error('"repositoryId" and "name" are required');
            err.statusCode = 400;
            throw err;
        }

        const application = await applicationService.createApplication(req.user._id, {
            repositoryId,
            name,
            slug,
            description,
        });

        res.status(201).json({ application });
    } catch (error) {
        next(error);
    }
};

export const updateApplication = async (req, res, next) => {
    try {
        await assertApplicationOwnership(req.user._id, req.params.id);
        const application = await applicationService.updateApplication(req.params.id, req.body);
        res.json({ application });
    } catch (error) {
        next(error);
    }
};

export const deleteApplication = async (req, res, next) => {
    try {
        await assertApplicationOwnership(req.user._id, req.params.id);
        await applicationService.deleteApplication(req.params.id);
        res.json({ success: true, message: 'Application deleted' });
    } catch (error) {
        next(error);
    }
};

export const getApplicationDeployments = async (req, res, next) => {
    try {
        await assertApplicationOwnership(req.user._id, req.params.id);
        const deployments = await applicationService.getApplicationDeployments(req.params.id);
        res.json({ deployments });
    } catch (error) {
        next(error);
    }
};

export const getApplicationDomains = async (req, res, next) => {
    try {
        const application = await assertApplicationOwnership(req.user._id, req.params.id);
        res.json({
            domains: {
                default: application.defaultDomain,
                custom: application.customDomains || [],
            },
        });
    } catch (error) {
        next(error);
    }
};

export const getApplicationMetrics = async (req, res, next) => {
    try {
        await assertApplicationOwnership(req.user._id, req.params.id);
        // Use slug as metrics key since that's what the gateway records
        const application = await applicationService.getApplicationById(req.params.id);
        const metrics = gatewayService.getApplicationMetrics(application.slug);
        res.json({ metrics });
    } catch (error) {
        next(error);
    }
};

export const getGatewayMetrics = async (req, res, next) => {
    try {
        const metrics = gatewayService.getGlobalMetrics();
        res.json({ metrics });
    } catch (error) {
        next(error);
    }
};
