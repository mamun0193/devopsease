import { mkdirSync, existsSync, rmSync } from 'fs';
import path from 'path';
import { storageService } from '../storage/storage.service.js';

export function getWorkspacePath(userId, repoId) {
    const key = storageService.keys.workspace(`${userId}/${repoId}`);
    return storageService.getAbsolutePath(key);
}

export function ensureDirectoryExists(dirPath) {
    mkdirSync(dirPath, { recursive: true });
}

export function validateSafePath(targetPath) {
    // Only valid if using a local provider that returns absolute paths
    const baseKey = storageService.keys.workspace('');
    const resolvedBase = path.resolve(storageService.getAbsolutePath(baseKey));
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
