import Deployment from '../models/deployment.model.js';
import Repository from '../models/repository.model.js';
import Build from '../models/build.model.js';
import {
    stopDeployment,
    removeDeployment,
    rollbackDeployment,
} from '../services/deployment.service.js';

const ENV_MAP = { development: 'dev', staging: 'staging', production: 'production' };

export const getDeployments = async (req, res, next) => {
    try {
        const userId = req.user._id;

        const userRepos = await Repository.find({ userId }).select('_id defaultBranch').lean();
        const repoIds = userRepos.map(r => r._id);
        const repoMap = Object.fromEntries(userRepos.map(r => [r._id.toString(), r.defaultBranch]));

        const deployments = await Deployment.find({ repoId: { $in: repoIds } })
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();

        const buildIds = [...new Set(deployments.map(d => d.buildId?.toString()).filter(Boolean))];
        const builds = await Build.find({ _id: { $in: buildIds } }).select('_id commitHash tag').lean();
        const buildMap = Object.fromEntries(builds.map(b => [b._id.toString(), b]));

        const shaped = deployments.map(d => {
            const build = buildMap[d.buildId?.toString()] ?? {};
            const branch = repoMap[d.repoId?.toString()] ?? 'main';
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
                createdAt: d.createdAt,
                build: {
                    commitHash: build.commitHash ?? '0000000',
                    branch,
                },
            };
        });

        res.json({ deployments: shaped });
    } catch (error) {
        next(error);
    }
};

// Ownership helper 

async function assertDeploymentOwnership(userId, deploymentId) {
    const deployment = await Deployment.findById(deploymentId).lean();
    if (!deployment) {
        const err = new Error('Deployment not found');
        err.statusCode = 404;
        throw err;
    }

    const repo = await Repository.findOne({ _id: deployment.repoId, userId }).lean();
    if (!repo) {
        const err = new Error('Not authorized to manage this deployment');
        err.statusCode = 403;
        throw err;
    }

    return deployment;
}

//  Deployment Actions 

export const stopDeploymentAction = async (req, res, next) => {
    try {
        await assertDeploymentOwnership(req.user._id, req.params.id);
        const deployment = await stopDeployment(req.params.id);
        res.json({ deployment });
    } catch (error) {
        next(error);
    }
};

export const removeDeploymentAction = async (req, res, next) => {
    try {
        await assertDeploymentOwnership(req.user._id, req.params.id);
        const deployment = await removeDeployment(req.params.id);
        res.json({ deployment });
    } catch (error) {
        next(error);
    }
};

export const rollbackDeploymentAction = async (req, res, next) => {
    try {
        await assertDeploymentOwnership(req.user._id, req.params.id);
        const deployment = await rollbackDeployment(req.params.id);
        res.json({ deployment });
    } catch (error) {
        next(error);
    }
};
