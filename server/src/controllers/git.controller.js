import Repository from '../models/repository.model.js';
import { cloneRepository, pullLatest, checkoutBranch } from '../services/git.service.js';

export const cloneRepo = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { repoId } = req.params;
        const { force } = req.body;

        const repo = await Repository.findById(repoId);
        if (!repo) {
            return res.status(404).json({ message: 'Repository not found' });
        }
        if (repo.userId.toString() !== userId.toString()) {
            return res.status(403).json({ message: 'Access denied' });
        }

        const workspacePath = await cloneRepository(repo, { force: !!force });

        res.json({
            success: true,
            workspacePath,
            repoId: repo._id,
            branch: repo.defaultBranch || 'main'
        });
    } catch (error) {
        next(error);
    }
};

export const pullRepo = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { repoId } = req.params;

        const repo = await Repository.findById(repoId);
        if (!repo) {
            return res.status(404).json({ message: 'Repository not found' });
        }
        if (repo.userId.toString() !== userId.toString()) {
            return res.status(403).json({ message: 'Access denied' });
        }

        const result = await pullLatest(repo);

        res.json({
            success: true,
            workspacePath: result.workspacePath,
            repoId: repo._id,
            branch: result.branch
        });
    } catch (error) {
        next(error);
    }
};

export const checkoutRepo = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { repoId } = req.params;
        const { branch } = req.body;

        if (!branch) {
            return res.status(400).json({ message: 'branch is required' });
        }

        const repo = await Repository.findById(repoId);
        if (!repo) {
            return res.status(404).json({ message: 'Repository not found' });
        }
        if (repo.userId.toString() !== userId.toString()) {
            return res.status(403).json({ message: 'Access denied' });
        }

        const result = await checkoutBranch(repo, branch);

        res.json({
            success: true,
            workspacePath: result.workspacePath,
            repoId: repo._id,
            branch: result.branch
        });
    } catch (error) {
        next(error);
    }
};
