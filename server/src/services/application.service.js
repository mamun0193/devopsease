import Application from '../models/application.model.js';
import Deployment from '../models/deployment.model.js';
import Repository from '../models/repository.model.js';
import { getResolverForProvider } from '../gateway/resolverRegistry.js';
import gatewayEvents from '../gateway/gateway.events.js';
import logger from '../utils/logger.js';

const GATEWAY_BASE_URL = process.env.GATEWAY_BASE_URL || 'http://localhost:5173';

// Slug Generation 

function slugify(name) {
    return String(name)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 64) || 'app';
}

async function generateUniqueSlug(userId, baseName) {
    let slug = slugify(baseName);
    // Ensure minimum length for slug regex
    if (slug.length < 2) slug = slug + '-app';

    let candidate = slug;
    let suffix = 2;
    const MAX_ATTEMPTS = 20;

    for (let i = 0; i < MAX_ATTEMPTS; i++) {
        const exists = await Application.findOne({ userId, slug: candidate }).lean();
        if (!exists) return candidate;
        candidate = `${slug}-${suffix}`;
        suffix++;
    }

    // Fallback: append timestamp
    return `${slug}-${Date.now()}`;
}

// CRUD Operations 

async function createApplication(userId, { repositoryId, name, slug, description }) {
    const finalSlug = slug || await generateUniqueSlug(userId, name);
    const defaultDomain = `${GATEWAY_BASE_URL}/apps/${finalSlug}`;

    const application = await Application.create({
        userId,
        repositoryId,
        name: name.trim(),
        slug: finalSlug,
        description: description || '',
        defaultDomain,
        provider: 'docker', // Phase 1: default to Docker
    });

    logger.info('Application created', {
        applicationId: String(application._id),
        slug: finalSlug,
        userId: String(userId),
    });

    return application;
}

async function getApplications(userId) {
    const applications = await Application.find({ userId })
        .populate('currentDeploymentId')
        .populate('repositoryId', 'repoName owner provider')
        .sort({ updatedAt: -1 })
        .lean();

    // Attach gateway URL
    return applications.map(app => ({
        ...app,
        gatewayUrl: `${GATEWAY_BASE_URL}/apps/${app.slug}`,
    }));
}

async function getApplicationById(id) {
    const application = await Application.findById(id)
        .populate('currentDeploymentId')
        .populate('repositoryId', 'repoName owner provider cloneUrl')
        .lean();

    if (!application) return null;

    // Resolve runtime endpoint for Inspector-ready response
    // Returns the full RuntimeEndpoint descriptor (protocol, capabilities, metadata)
    let runtime = null;
    if (application.currentDeploymentId) {
        const deployment = application.currentDeploymentId; // Already populated
        try {
            const resolver = getResolverForProvider(application.provider || 'docker');
            const runtimeEndpoint = await resolver.resolve(deployment);
            runtime = {
                ...runtimeEndpoint,
                deploymentId: String(deployment._id),
                applicationId: String(application._id),
            };
        } catch (err) {
            logger.debug('Failed to resolve runtime for application detail', {
                applicationId: String(id),
                error: err.message,
            });
        }
    }

    return {
        ...application,
        gatewayUrl: application.defaultDomain || `${GATEWAY_BASE_URL}/apps/${application.slug}`,
        runtime,
    };
}

async function getApplicationBySlug(userId, slug) {
    return Application.findOne({ userId, slug }).lean();
}

async function updateApplication(id, updates) {
    const allowed = ['name', 'description', 'visibility'];
    const filtered = {};
    for (const key of allowed) {
        if (updates[key] !== undefined) filtered[key] = updates[key];
    }

    const application = await Application.findByIdAndUpdate(id, filtered, { new: true }).lean();

    if (application) {
        gatewayEvents.emit('application:updated', {
            applicationId: String(application._id),
            slug: application.slug,
        });
    }

    return application;
}

async function deleteApplication(id) {
    const application = await Application.findById(id);
    if (!application) return null;

    const slug = application.slug;

    // Emit event before deletion so cache can invalidate
    gatewayEvents.emit('application:deleted', {
        applicationId: String(application._id),
        slug,
    });

    await Application.findByIdAndDelete(id);

    logger.info('Application deleted', {
        applicationId: String(id),
        slug,
    });

    return application;
}

// Deployment Integration 

async function setCurrentDeployment(applicationId, deploymentId) {
    const application = await Application.findByIdAndUpdate(
        applicationId,
        { currentDeploymentId: deploymentId },
        { new: true },
    );

    if (application) {
        // Sync health from runtime provider
        await syncApplicationHealth(applicationId);

        gatewayEvents.emit('application:updated', {
            applicationId: String(application._id),
            slug: application.slug,
        });
    }

    return application;
}

async function syncApplicationHealth(applicationId) {
    const application = await Application.findById(applicationId)
        .populate('currentDeploymentId')
        .lean();

    if (!application) return;

    let health = 'stopped';
    let status = 'stopped';

    if (application.currentDeploymentId) {
        const deployment = application.currentDeploymentId;

        try {
            const resolver = getResolverForProvider(application.provider || 'docker');
            const isHealthy = await resolver.isHealthy(deployment);

            if (isHealthy) {
                health = 'running';
                status = 'running';
            } else if (['deploying', 'pending'].includes(deployment.status)) {
                health = 'starting';
                status = 'starting';
            } else if (deployment.status === 'failed') {
                health = 'unhealthy';
                status = 'unhealthy';
            } else {
                health = 'stopped';
                status = 'stopped';
            }
        } catch (err) {
            logger.debug('Health sync failed', {
                applicationId: String(applicationId),
                error: err.message,
            });
            health = 'unhealthy';
            status = 'unhealthy';
        }
    }

    await Application.findByIdAndUpdate(applicationId, { health, status });
}

// Ensure an Application exists for a deployment.
// Called by deployFromBuild() — auto-creates if missing.
 
async function ensureApplicationForDeployment(deployment) {
    if (!deployment?.repoId) return null;

    const repoId = deployment.repoId;

    // Check if an Application already exists for this repository
    let application = await Application.findOne({ repositoryId: repoId });

    if (!application) {
        // Auto-create from repository metadata
        const repo = await Repository.findById(repoId).select('userId repoName').lean();
        if (!repo) return null;

        application = await createApplication(repo.userId, {
            repositoryId: repoId,
            name: repo.repoName,
        });

        logger.info('Auto-created Application for deployment', {
            applicationId: String(application._id),
            slug: application.slug,
            repoId: String(repoId),
        });
    }

    // Set this deployment as the current deployment
    await setCurrentDeployment(application._id, deployment._id);

    return application;
}

// Get all deployments for an application.
 
async function getApplicationDeployments(applicationId) {
    const application = await Application.findById(applicationId).lean();
    if (!application) return [];

    return Deployment.find({ repoId: application.repositoryId })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();
}

export default {
    createApplication,
    getApplications,
    getApplicationById,
    getApplicationBySlug,
    updateApplication,
    deleteApplication,
    setCurrentDeployment,
    syncApplicationHealth,
    ensureApplicationForDeployment,
    getApplicationDeployments,
    generateUniqueSlug,
};
