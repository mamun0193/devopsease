import Deployment from '../models/deployment.model.js';
import Repository from '../models/repository.model.js';
import Build from '../models/build.model.js';

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
