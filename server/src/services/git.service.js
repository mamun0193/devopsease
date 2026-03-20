import simpleGit from 'simple-git';
import logger from '../utils/logger.js';
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

    const git = createGit(workspacePath);
    const branch = repo.defaultBranch || 'main';

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

export default { cloneRepository, pullLatest, checkoutBranch };
