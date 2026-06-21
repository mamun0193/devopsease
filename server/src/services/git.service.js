import simpleGit from 'simple-git';
import logger from '../utils/logger.js';
import fs from 'fs';
import path from 'path';
import {
    getWorkspacePath,
    ensureDirectoryExists,
    validateSafePath,
    cleanWorkspace,
    isClonedRepo
} from '../utils/workspace.js';

const GIT_TIMEOUT = 60_000;

function createGit(basePath) {
    return simpleGit(basePath, { timeout: { block: GIT_TIMEOUT } });
}

export async function cloneRepository(repo, options = {}) {
    const workspacePath = getWorkspacePath(repo.userId, repo._id);
    validateSafePath(workspacePath);

    if (isClonedRepo(workspacePath)) {
        if (options.force) {
            logger.info(`[GIT] Force re-clone: ${repo.repoName}`);
            cleanWorkspace(workspacePath);
        } else {
            logger.info(`[GIT] Repo already cloned: ${repo.repoName}`);
            return workspacePath;
        }
    } else {
        cleanWorkspace(workspacePath);
    }

    ensureDirectoryExists(workspacePath);

    logger.info(`[GIT] Cloning ${repo.repoName} → ${workspacePath}`);

    const git = simpleGit({ timeout: { block: GIT_TIMEOUT } });
    await git.clone(repo.cloneUrl, workspacePath, [
        '--branch', repo.defaultBranch || 'main',
        '--depth', '1'
    ]);

    return workspacePath;
}

export async function pullLatest(repo) {
    const workspacePath = getWorkspacePath(repo.userId, repo._id);
    validateSafePath(workspacePath);

    if (!isClonedRepo(workspacePath)) {
        throw new Error(`Workspace not found for ${repo.repoName}. Clone it first.`);
    }

    // Cleanup any lingering index.lock from crashed git processes
    const lockPath = path.join(workspacePath, '.git', 'index.lock');
    if (fs.existsSync(lockPath)) {
        try {
            fs.rmSync(lockPath, { force: true });
            logger.info(`[GIT] Removed stale index.lock for ${repo.repoName}`);
        } catch (err) {
            logger.warn(`[GIT] Failed to remove index.lock for ${repo.repoName}: ${err.message}`);
        }
    }

    const git = createGit(workspacePath);
    const branch = repo.defaultBranch || 'main';

    logger.info(`[GIT] Resetting workspace for ${repo.repoName}`);
    await git.reset(['--hard']);
    await git.clean('f', ['-d']);

    logger.info(`[GIT] Pulling latest on ${repo.repoName} (${branch})`);
    await git.pull('origin', branch);

    return { workspacePath, branch };
}

export async function checkoutBranch(repo, branch) {
    const workspacePath = getWorkspacePath(repo.userId, repo._id);
    validateSafePath(workspacePath);

    if (!isClonedRepo(workspacePath)) {
        throw new Error(`Workspace not found for ${repo.repoName}. Clone it first.`);
    }

    const git = createGit(workspacePath);

    const remotes = await git.branch(['-r']);
    const remoteBranch = `origin/${branch}`;

    if (remotes.all.includes(remoteBranch)) {
        logger.info(`[GIT] Checking out remote branch: ${branch}`);
        await git.checkout(branch);
    } else {
        logger.info(`[GIT] Creating new branch from HEAD: ${branch}`);
        await git.checkoutLocalBranch(branch);
    }

    return { workspacePath, branch };
}

export async function getLatestCommit(repo) {
    const workspacePath = getWorkspacePath(repo.userId, repo._id);
    validateSafePath(workspacePath);

    if (!isClonedRepo(workspacePath)) {
        return null;
    }

    try {
        const git = createGit(workspacePath);
        const log = await git.log(['-1', '--format=%H|%s|%an']);
        if (!log.latest) return null;
        
        // simple-git parses the format correctly if we just use log.latest.hash, etc.
        // wait, simple-git automatically extracts hash, message, author_name if we use default git.log()
        const defaultLog = await git.log({ maxCount: 1 });
        if (defaultLog.latest) {
            return {
                commitHash: defaultLog.latest.hash,
                commitMessage: defaultLog.latest.message,
                author: defaultLog.latest.author_name
            };
        }
        return null;
    } catch (err) {
        logger.error(`[GIT] Failed to get latest commit for ${repo.repoName}`, { error: err.message });
        return null;
    }
}

export default { cloneRepository, pullLatest, checkoutBranch, getLatestCommit };
