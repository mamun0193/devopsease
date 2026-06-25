import { storageService } from '../storage/storage.service.js';
import logger from '../utils/logger.js';

// Helper to extract the storage key from a metadata object
function extractKey(logPath) {
    if (!logPath) return null;
    if (typeof logPath === 'object') return logPath.key;
    const parts = logPath.split(/[\\/]/);
    const filename = parts[parts.length - 1];
    return `logs/deployments/${filename}`;
}

export async function initLogFile(executionId) {
    const key = storageService.keys.deploymentLog(executionId);
    await storageService.write(key, '');
    logger.debug('Execution log file initialized via StorageService', { executionId, key });
    return storageService.createPointer(key);
}

export async function appendLogLine(logPath, line) {
    const key = extractKey(logPath);
    if (!key || !line) return;
    await storageService.append(key, line);
}

export async function closeAppendStream(logPath) {
    const key = extractKey(logPath);
    if (!key) return;
    await storageService.closeAppendStream(key);
}

export async function readLogFile(logPath) {
    const key = extractKey(logPath);
    if (!key) return '';
    try {
        const content = await storageService.read(key);
        return content || '';
    } catch (err) {
        logger.error('Failed to read execution log via StorageService', { key, error: err.message });
        return '';
    }
}

export function createLogReadStream(logPath, options = {}) {
    const key = extractKey(logPath);
    if (!key) return null;
    return storageService.createReadStream(key, options);
}

export async function getLogSize(logPath) {
    const key = extractKey(logPath);
    if (!key) return 0;
    try {
        const meta = await storageService.metadata(key);
        return meta ? meta.size : 0;
    } catch (err) {
        logger.error('Failed to stat execution log via StorageService', { key, error: err.message });
        return 0;
    }
}
