import Deployment from '../models/deployment.model.js';
import Repository from '../models/repository.model.js';
import Build from '../models/build.model.js';
import Application from '../models/application.model.js';
import docker from '../docker/client.js';
import {
    startDeployment,
    stopDeployment,
    removeDeployment,
    rollbackDeployment,
    scaleDeployment,
} from '../services/deployment.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { standardResponse } from '../utils/apiResponse.js';
import { NotFoundError, ForbiddenError, ValidationError } from '../utils/AppError.js';

const ENV_MAP = { development: 'dev', staging: 'staging', production: 'production' };

export const getDeployments = asyncHandler(async (req, res) => {
        const userId = req.user._id;

        const userRepos = await Repository.find({ userId }).select('_id repoName defaultBranch').lean();
        const repoIds = userRepos.map(r => r._id);
        const repoMap = Object.fromEntries(userRepos.map(r => [r._id.toString(), r]));

        const deployments = await Deployment.find({ 
            repoId: { $in: repoIds },
            status: { $ne: 'removed' }
        })
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();

        const buildIds = [...new Set(deployments.map(d => d.buildId?.toString()).filter(Boolean))];
        const builds = await Build.find({ _id: { $in: buildIds } }).select('_id commitHash tag').lean();
        const buildMap = Object.fromEntries(builds.map(b => [b._id.toString(), b]));

        const mongoose = await import('mongoose');
        const PipelineRun = mongoose.default.model('PipelineRun');
        const pipelineRuns = await PipelineRun.find({ buildId: { $in: buildIds } }).select('buildId commitHash branch').lean();
        const pipelineRunMap = Object.fromEntries(pipelineRuns.map(pr => [pr.buildId?.toString(), pr]));

        // Look up Applications for slug mapping
        const applications = await Application.find({
            repositoryId: { $in: repoIds }
        }).select('repositoryId slug').lean();
        const appByRepoId = Object.fromEntries(
            applications.map(a => [a.repositoryId?.toString(), a])
        );

        const shaped = deployments.map(d => {
            const build = buildMap[d.buildId?.toString()] ?? {};
            const pr = pipelineRunMap[d.buildId?.toString()] || {};
            const repo = repoMap[d.repoId?.toString()] || {};
            const app = appByRepoId[d.repoId?.toString()];
            const branch = pr.branch || repo.defaultBranch || 'main';
            const repoName = repo.repoName || 'Unknown';
            const rawEnv = d.environment ?? 'development';
            const environment = ENV_MAP[rawEnv] ?? rawEnv;
            const status = ['pending', 'deploying', 'running', 'failed', 'stopped', 'removed'].includes(d.status)
                ? (d.status === 'pending' ? 'deploying' : d.status === 'removed' ? 'stopped' : d.status)
                : 'stopped';

            return {
                _id: d._id,
                status,
                environment,
                imageTag: d.imageTag ?? build.tag ?? null,
                port: d.port,
                createdAt: d.createdAt,
                repositoryName: repoName,
                applicationId: app?._id?.toString() || null,
                applicationSlug: app?.slug || null,
                build: {
                    commitHash: build.commitHash || pr.commitHash || null,
                    branch,
                },
            };
        });

        res.json(standardResponse({ deployments: shaped }));
});

export const getDeploymentById = asyncHandler(async (req, res) => {
    const deployment = await assertDeploymentOwnership(req.user._id, req.params.id);
    res.json(standardResponse({ deployment }));
});

export const getDeploymentLogs = asyncHandler(async (req, res) => {
    const deployment = await assertDeploymentOwnership(req.user._id, req.params.id);

    if (!deployment.containerId) {
        return res.json(standardResponse({ logs: [] }));
    }

        const container = docker.getContainer(deployment.containerId);
        const rawLogs = await container.logs({
            stdout: true,
            stderr: true,
            tail: 300,
            timestamps: false,
        });

    const decoded = rawLogs
        .toString('utf8')
        .split('\n')
        .map((line) => line.replace(/^[\x00-\x08\x0b-\x1f]/g, '').trim())
        .filter(Boolean);

    res.json(standardResponse({ logs: decoded }));
});

// Ownership helper — T3: prefer direct userId match, fallback to repo-based lookup for pre-migration docs

async function assertDeploymentOwnership(userId, deploymentId) {
    const deployment = await Deployment.findById(deploymentId).lean();
    if (!deployment) {
        throw new NotFoundError('Deployment not found');
    }

    // Fast path: direct userId comparison (post-migration deployments)
    if (deployment.userId) {
        if (deployment.userId.toString() !== userId.toString()) {
            throw new ForbiddenError('Not authorized to manage this deployment');
        }
        return deployment;
    }

    // Fallback: legacy deployments without userId — check via Repository
    const repo = await Repository.findOne({ _id: deployment.repoId, userId }).lean();
    if (!repo) {
        throw new ForbiddenError('Not authorized to manage this deployment');
    }

    return deployment;
}

//  Deployment Actions 

export const startDeploymentAction = asyncHandler(async (req, res) => {
    await assertDeploymentOwnership(req.user._id, req.params.id);
    const deployment = await startDeployment(req.params.id);
    res.json(standardResponse({ deployment }));
});

export const stopDeploymentAction = asyncHandler(async (req, res) => {
    await assertDeploymentOwnership(req.user._id, req.params.id);
    const deployment = await stopDeployment(req.params.id);
    res.json(standardResponse({ deployment }));
});

export const removeDeploymentAction = asyncHandler(async (req, res) => {
    await assertDeploymentOwnership(req.user._id, req.params.id);
    const deployment = await removeDeployment(req.params.id);
    res.json(standardResponse({ deployment }));
});

export const rollbackDeploymentAction = asyncHandler(async (req, res) => {
    await assertDeploymentOwnership(req.user._id, req.params.id);
    const deployment = await rollbackDeployment(req.params.id, {
        reason: req.body?.reason,
    });
    res.json(standardResponse({ deployment }));
});

export const scaleDeploymentAction = asyncHandler(async (req, res) => {
    await assertDeploymentOwnership(req.user._id, req.params.id);

    const replicas = Number(req.body?.replicas);
    if (!Number.isInteger(replicas) || replicas < 1) {
        throw new ValidationError('"replicas" must be a positive integer');
    }

    const deployment = await scaleDeployment(req.params.id, replicas);
    res.json(standardResponse({ deployment }));
});
