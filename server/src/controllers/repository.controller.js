import Repository from '../models/repository.model.js';
import { ensureDefaultEnvironments } from '../services/env.service.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Validate that a clone URL looks like a real Git remote
function isValidCloneUrl(url) {
    // HTTPS: https://github.com/owner/repo.git or https://gitlab.com/owner/repo
    // SSH:   git@github.com:owner/repo.git
    const httpsPattern = /^https?:\/\/[a-zA-Z0-9._-]+\.[a-zA-Z]{2,}\/.+/;
    const sshPattern = /^git@[a-zA-Z0-9._-]+\.[a-zA-Z]{2,}:.+/;
    return httpsPattern.test(url) || sshPattern.test(url);
}

// Verify the remote repository is reachable via git ls-remote
async function verifyRepoReachable(cloneUrl) {
    try {
        await execAsync(`git ls-remote --exit-code "${cloneUrl}"`, { timeout: 15000 });
        return { reachable: true };
    } catch (error) {
        return {
            reachable: false,
            reason: error.stderr?.includes('not found')
                ? 'Repository not found. Check the URL and permissions.'
                : error.stderr?.includes('Authentication')
                    ? 'Authentication failed. The repository may be private.'
                    : 'Could not reach the repository. Verify the URL is correct.',
        };
    }
}

export const connectRepository = async (req, res, next) => {
    try {
        const { repoName, owner, cloneUrl, defaultBranch, provider } = req.body;
        const userId = req.user._id;

        if (!repoName || !owner || !cloneUrl) {
            return res.status(400).json({ message: 'repoName, owner, and cloneUrl are required' });
        }

        // Validate URL format
        const trimmedUrl = cloneUrl.trim();
        if (!isValidCloneUrl(trimmedUrl)) {
            return res.status(400).json({
                message: 'Invalid clone URL format. Use HTTPS (https://github.com/owner/repo.git) or SSH (git@github.com:owner/repo.git).',
            });
        }

        // Check for duplicates
        const existing = await Repository.findOne({ userId, cloneUrl: trimmedUrl });
        if (existing) {
            return res.status(409).json({
                message: `Repository "${existing.repoName}" is already connected with this URL.`,
            });
        }

        // Verify the repo is reachable
        const verification = await verifyRepoReachable(trimmedUrl);
        if (!verification.reachable) {
            return res.status(422).json({ message: verification.reason });
        }

        const repository = await Repository.create({
            userId,
            provider,
            repoName: repoName.trim(),
            owner: owner.trim(),
            cloneUrl: trimmedUrl,
            defaultBranch: defaultBranch?.trim() || 'main',
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
