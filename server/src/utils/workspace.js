import { mkdirSync, existsSync, rmSync } from 'fs';
import path from 'path';

const BASE_WORKSPACE = path.join(process.cwd(), 'workspace');

export function getWorkspacePath(userId, repoId) {
    return path.join(BASE_WORKSPACE, userId.toString(), repoId.toString());
}

export function ensureDirectoryExists(dirPath) {
    mkdirSync(dirPath, { recursive: true });
}

export function validateSafePath(targetPath) {
    const resolvedBase = path.resolve(BASE_WORKSPACE);
    const resolvedTarget = path.resolve(targetPath);

    if (!resolvedTarget.startsWith(resolvedBase)) {
        throw new Error('Invalid path access — traversal detected');
    }

    return resolvedTarget;
}

export function cleanWorkspace(dirPath) {
    if (dirPath && existsSync(dirPath)) {
        rmSync(dirPath, { recursive: true, force: true });
    }
}

export function isClonedRepo(dirPath) {
    return existsSync(path.join(dirPath, '.git'));
}

export { BASE_WORKSPACE };
