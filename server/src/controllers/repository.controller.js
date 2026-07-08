import Repository from '../models/repository.model.js';
import { ensureDefaultEnvironments } from '../services/env.service.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ValidationError, ConflictError, NotFoundError } from '../utils/AppError.js';
import { standardResponse, paginatedResponse, getPagination } from '../utils/apiResponse.js';

const execAsync = promisify(exec);

// Validate that a clone URL looks like a real Git remote
function isValidCloneUrl(url) {
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

export const connectRepository = asyncHandler(async (req, res) => {
    const { repoName, owner, cloneUrl, defaultBranch, provider } = req.body;
    const userId = req.user._id;

    if (!repoName || !owner || !cloneUrl) {
        throw new ValidationError('repoName, owner, and cloneUrl are required');
    }

    const trimmedUrl = cloneUrl.trim();
    if (!isValidCloneUrl(trimmedUrl)) {
        throw new ValidationError('Invalid clone URL format. Use HTTPS or SSH.');
    }

    const existing = await Repository.findOne({ userId, cloneUrl: trimmedUrl });
    if (existing) {
        throw new ConflictError(`Repository "${existing.repoName}" is already connected with this URL.`);
    }

    const verification = await verifyRepoReachable(trimmedUrl);
    if (!verification.reachable) {
        throw new ValidationError(verification.reason);
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
    res.status(201).json(standardResponse(repository));
});

export const getRepositories = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { page, limit, skip } = getPagination(req);

    const totalCount = await Repository.countDocuments({ userId });
    const repositories = await Repository.find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

    res.json(paginatedResponse(repositories, totalCount, page, limit));
});

export const deleteRepository = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { id } = req.params;

    const deleted = await Repository.findOneAndDelete({ _id: id, userId });
    if (!deleted) {
        throw new NotFoundError('Repository not found');
    }

    res.json(standardResponse({ deleted: true }));
});
