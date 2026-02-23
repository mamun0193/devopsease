import docker from '../docker/client.js';
import Project from '../models/project.model.js';
import Image from '../models/image.js';
import logger from '../utils/logger.js';
import { validateComposeYaml } from './composeValidation.service.js';
import resourceService from '../resources/resource.service.js';
import { RESOURCE_TYPES } from '../resources/resourceTypes.js';
import {
    createContainer,
    removeContainer,
    startContainer,
    stopContainer,
} from '../docker/containerActions.js';
import ownershipService from './ownership.service.js';
import imageObservabilityService from './imageObservability.service.js';
import imageRegistrationService from './imageRegistration.service.js';
import networkService from './network.service.js';
import volumeService from './volume.service.js';

const MAX_PROJECTS_PER_USER = 5;

function slugify(str) {
    return str.toLowerCase().replace(/[^a-z0-9_-]/g, '_').substring(0, 48);
}

function isPublicImage(imageName) {
    if (!imageName.includes('/')) return true;
    if (imageName.startsWith('library/')) return true;
    return false;
}

function extractDisplayName(namespace, svcName) {
    return svcName;
}

class ProjectService {

    async createProject(userId, name, composeYaml) {
        const projectCount = await Project.countDocuments({ userId });
        if (projectCount >= MAX_PROJECTS_PER_USER) {
            throw Object.assign(new Error(`Maximum ${MAX_PROJECTS_PER_USER} projects allowed`), { statusCode: 429 });
        }

        const existing = await Project.findOne({ userId, name });
        if (existing) {
            throw Object.assign(new Error(`Project "${name}" already exists`), { statusCode: 409 });
        }

        const { valid, errors, parsedCompose } = validateComposeYaml(composeYaml);
        if (!valid) {
            throw Object.assign(new Error('Compose validation failed'), { statusCode: 400, validationErrors: errors });
        }

        const slug = slugify(name);
        const namespace = `project_${userId}_${slug}`;

        const createdContainers = [];
        let dbNetwork = null;
        const createdVolumes = [];

        try {
            // Verify all images before creating anything
            for (const [svcName, svcConfig] of Object.entries(parsedCompose.services)) {
                const imageName = svcConfig.image;
                if (!isPublicImage(imageName)) {
                    const userImage = await Image.findOne({ userId, tag: imageName });
                    if (!userImage) {
                        throw Object.assign(
                            new Error(`Service "${svcName}": image "${imageName}" not found. Only user-owned or public images are allowed`),
                            { statusCode: 400 }
                        );
                    }
                }
            }

            // Create governed, isolated network via NetworkService.
            // Returns a DB-persisted Network document; driver is always 'bridge'.
            dbNetwork = await networkService.createIsolatedNetwork({
                userId,
                projectId: null,      // will be linked after project doc created
                projectName: name
            });

            // The Docker network name is stored in dbNetwork.name
            const dockerNetworkName = dbNetwork.name;

            // Collect and create governed volumes from all services
            const volumeNameMap = new Map(); // logicalName → dockerVolumeName
            for (const [, svcConfig] of Object.entries(parsedCompose.services)) {
                if (Array.isArray(svcConfig.volumes)) {
                    for (const vol of svcConfig.volumes) {
                        const volStr = typeof vol === 'string' ? vol : '';
                        const parts = volStr.split(':');
                        if (parts.length >= 2) {
                            const source = parts[0];
                            // Only named volumes pass validation; source is always a name
                            if (source && !volumeNameMap.has(source)) {
                                const volDoc = await volumeService.ensureVolumeExists({
                                    userId,
                                    projectId: null,
                                    projectName: name,
                                    volumeName: source
                                });
                                volumeNameMap.set(source, volDoc.dockerVolumeName);
                                createdVolumes.push(volDoc);
                            }
                        }
                    }
                }
            }

            // Create containers for each service via ContainerService
            for (const [svcName, svcConfig] of Object.entries(parsedCompose.services)) {
                const containerName = `${namespace}_${svcName}`;

                // Build ports as { containerPort: hostPort } for createContainer
                const ports = {};
                if (svcConfig.ports) {
                    for (const portMapping of svcConfig.ports) {
                        const portStr = String(portMapping);
                        const parts = portStr.split(':');
                        if (parts.length === 2) {
                            ports[parts[1]] = parts[0];
                        } else {
                            ports[parts[0]] = '';
                        }
                    }
                }

                // Build env as { key: value } for createContainer
                const env = {};
                if (svcConfig.environment) {
                    if (Array.isArray(svcConfig.environment)) {
                        for (const entry of svcConfig.environment) {
                            const eqIdx = String(entry).indexOf('=');
                            if (eqIdx > 0) {
                                env[String(entry).substring(0, eqIdx)] = String(entry).substring(eqIdx + 1);
                            }
                        }
                    } else {
                        Object.assign(env, svcConfig.environment);
                    }
                }

                // Delegate to containerActions.createContainer (handles pull, name validation, Docker create, auto-start)
                const result = await createContainer({
                    image: svcConfig.image,
                    name: containerName,
                    ports,
                    env,
                    autoStart: true,
                    // Attach container to the governed network by its Docker-side name
                    networkMode: dockerNetworkName,
                    labels: {
                        'devopsease.project': namespace,
                        'devopsease.service': svcName,
                        'devopsease.userId': userId.toString()
                    },
                    // Rewrite volume mounts to use namespaced Docker volume names
                    volumes: svcConfig.volumes ? svcConfig.volumes.map(vol => {
                        const volStr = typeof vol === 'string' ? vol : '';
                        const parts = volStr.split(':');
                        if (parts.length >= 2 && volumeNameMap.has(parts[0])) {
                            return [volumeNameMap.get(parts[0]), ...parts.slice(1)].join(':');
                        }
                        return vol;
                    }) : undefined,
                    command: svcConfig.command,
                    restartPolicy: svcConfig.restart || 'no',
                });

                if (!result.success) {
                    throw Object.assign(new Error(result.message), { statusCode: result.statusCode || 500 });
                }

                const containerId = result.data.id;
                createdContainers.push({ name: svcName, containerId, image: svcConfig.image });

                // Register ownership so container appears in /containers API
                await ownershipService.registerContainer(userId, containerId);

                // Register as resource for unified tracking
                await resourceService.registerResource({
                    resourceId: containerId,
                    type: RESOURCE_TYPES.CONTAINER,
                    ownerId: userId,
                    metadata: {
                        image: svcConfig.image,
                        name: containerName,
                        createdVia: 'compose',
                        projectNamespace: namespace,
                        serviceName: svcName,
                        created: new Date()
                    }
                });

                // Register image in Image model (dedup by dockerImageId inside service)
                try {
                    await imageRegistrationService.ensureImageRegistered({
                        userId,
                        imageName: svcConfig.image
                    });
                } catch (imgErr) {
                    logger.warn(`Failed to register image for service "${svcName}"`, { error: imgErr.message });
                }
            }

            // Save project to DB — store the Network document's ObjectId, not the raw Docker ID
            const project = await Project.create({
                userId,
                name,
                namespace,
                composeYaml,
                status: 'RUNNING',
                services: createdContainers,
                networks: [dbNetwork._id],
                volumes: createdVolumes.map(v => v._id)
            });

            // Link network and volumes back to the project
            dbNetwork.projectId = project._id;
            await dbNetwork.save();

            for (const volDoc of createdVolumes) {
                volDoc.projectId = project._id;
                await volDoc.save();
            }

            // Register project as resource
            await resourceService.registerResource({
                resourceId: project._id.toString(),
                type: RESOURCE_TYPES.PROJECT,
                ownerId: userId,
                metadata: { name, namespace, serviceCount: createdContainers.length }
            });

            // Trigger image observability reconciliation
            imageObservabilityService.reconcileImageUsage().catch(() => { });

            logger.info(`Project "${name}" created`, { userId: userId.toString(), namespace, services: createdContainers.length });

            return project;

        } catch (error) {
            // Rollback: remove containers via ContainerService (handles action history, cache invalidation)
            for (const svc of createdContainers) {
                try {
                    await removeContainer(svc.containerId, true);
                    await ownershipService.releaseOwnership(userId, svc.containerId).catch(() => { });
                    await resourceService.updateResourceStatus(svc.containerId, RESOURCE_TYPES.CONTAINER, 'deleted').catch(() => { });
                } catch (_) { }
            }

            // Remove governed network if created (cleans both Docker and DB record)
            if (dbNetwork) {
                try {
                    await networkService.deleteNetwork({ networkId: dbNetwork._id, userId });
                } catch (_) { }
            }

            // Remove governed volumes if created
            for (const volDoc of createdVolumes) {
                try {
                    await volumeService.deleteVolume({ volumeId: volDoc._id, userId });
                } catch (_) { }
            }

            throw error;
        }
    }

    async getProjects(userId) {
        return Project.find({ userId })
            .select('-composeYaml')
            .sort({ createdAt: -1 })
            .lean();
    }

    async getProjectById(userId, projectId) {
        const project = await Project.findOne({ _id: projectId, userId }).lean();
        if (!project) {
            throw Object.assign(new Error('Project not found'), { statusCode: 404 });
        }
        return project;
    }

    async stopProject(userId, projectId) {
        const project = await Project.findOne({ _id: projectId, userId });
        if (!project) {
            throw Object.assign(new Error('Project not found'), { statusCode: 404 });
        }

        for (const svc of project.services) {
            try {
                await stopContainer(svc.containerId);
            } catch (err) {
                if (!err.message?.includes('not running') && !err.message?.includes('No such container')) {
                    logger.warn(`Failed to stop container ${svc.containerId}`, { error: err.message });
                }
            }
        }

        project.status = 'STOPPED';
        await project.save();

        logger.info(`Project "${project.name}" stopped`, { userId: userId.toString() });
        return project;
    }

    async startProject(userId, projectId) {
        const project = await Project.findOne({ _id: projectId, userId });
        if (!project) {
            throw Object.assign(new Error('Project not found'), { statusCode: 404 });
        }

        for (const svc of project.services) {
            try {
                await startContainer(svc.containerId);
            } catch (err) {
                if (!err.message?.includes('already started')) {
                    logger.warn(`Failed to start container ${svc.containerId}`, { error: err.message });
                }
            }
        }

        project.status = 'RUNNING';
        await project.save();

        logger.info(`Project "${project.name}" started`, { userId: userId.toString() });
        return project;
    }

    async deleteProject(userId, projectId) {
        const project = await Project.findOne({ _id: projectId, userId });
        if (!project) {
            throw Object.assign(new Error('Project not found'), { statusCode: 404 });
        }

        // Remove containers via ContainerService (handles action history, cache, exec cleanup)
        for (const svc of project.services) {
            try {
                await removeContainer(svc.containerId, true);
                await ownershipService.releaseOwnership(userId, svc.containerId).catch(() => { });
                await resourceService.updateResourceStatus(svc.containerId, RESOURCE_TYPES.CONTAINER, 'deleted').catch(() => { });
            } catch (err) {
                if (!err.message?.includes('No such container') && !err.message?.includes('not found')) {
                    logger.warn(`Failed to remove container ${svc.containerId}`, { error: err.message });
                }
            }
        }

        // Remove governed networks via NetworkService (cleans Docker + DB, handles not-found)
        for (const netId of project.networks) {
            try {
                await networkService.deleteNetwork({ networkId: netId, userId });
            } catch (err) {
                if (!err.message?.includes('not found') && !err.statusCode === 404) {
                    logger.warn(`Failed to remove network ${netId}`, { error: err.message });
                }
            }
        }

        // Mark governed volumes as UNUSED (preserve data for manual prune)
        await volumeService.markProjectVolumesUnused(project._id, userId);

        // Update project resource status
        await resourceService.updateResourceStatus(project._id.toString(), RESOURCE_TYPES.PROJECT, 'deleted');

        // Remove from DB
        await Project.deleteOne({ _id: projectId, userId });

        // Trigger image observability reconciliation
        imageObservabilityService.reconcileImageUsage().catch(() => { });

        logger.info(`Project "${project.name}" deleted`, { userId: userId.toString() });
        return { deleted: true };
    }
}

export default new ProjectService();
