import Repository from '../models/repository.model.js';
import { ensureDefaultEnvironments } from '../services/env.service.js';

export const connectRepository = async (req, res, next) => {
    try {
        const { repoName, owner, cloneUrl, defaultBranch, provider } = req.body;
        const userId = req.user._id;

        if (!repoName || !owner || !cloneUrl) {
            return res.status(400).json({ message: 'repoName, owner, and cloneUrl are required' });
        }

        const repository = await Repository.create({
            userId,
            provider,
            repoName,
            owner,
            cloneUrl,
            defaultBranch
        });

        await ensureDefaultEnvironments(repository._id);

        res.status(201).json({ repository });
    } catch (error) {
        next(error);
    }
};

export const getRepositories = async (req, res, next) => {
    try {
        const userId = req.user._id;

        const repositories = await Repository.find({ userId })
            .sort({ createdAt: -1 })
            .lean();

        res.json({ repositories });
    } catch (error) {
        next(error);
    }
};

export const deleteRepository = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { id } = req.params;

        const deleted = await Repository.findOneAndDelete({ _id: id, userId });

        if (!deleted) {
            return res.status(404).json({ message: 'Repository not found' });
        }

        res.json({ message: 'Repository deleted successfully' });
    } catch (error) {
        next(error);
    }
};
