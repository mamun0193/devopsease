import { mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import logger from './logger.js';

const BASE_DIR = join(tmpdir(), 'devopsease-builds');

export function createTempBuildDir(buildId) {
    const dirPath = join(BASE_DIR, buildId);
    mkdirSync(dirPath, { recursive: true });
    return dirPath;
}

export function cleanupTempDir(dirPath) {
    try {
        if (dirPath && existsSync(dirPath)) {
            rmSync(dirPath, { recursive: true, force: true });
            logger.debug('Cleaned temp build dir', { dirPath });
        }
    } catch (error) {
        logger.warn('Failed to cleanup temp dir', { dirPath, error: error.message });
    }
}
