import { createWriteStream, createReadStream as fsCreateReadStream, existsSync } from 'fs';
import { mkdir, stat, readFile } from 'fs/promises';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Resolve storage directory relative to the server root (two levels up from services/)
const STORAGE_DIR = join(__dirname, '..', '..', 'storage', 'pipeline-runs');
const RESOLVED_STORAGE_DIR = resolve(STORAGE_DIR);

export { STORAGE_DIR };

let dirReady = false;
async function ensureStorageDir() {
    if (dirReady) return;
    await mkdir(STORAGE_DIR, { recursive: true });
    dirReady = true;
}

export function getLogPath(runId) {
    return join(STORAGE_DIR, `${runId}.log`);
}

export async function initLogFile(runId) {
    await ensureStorageDir();
    const logPath = getLogPath(runId);

    const ws = createWriteStream(logPath, { flags: 'w', encoding: 'utf8' });
    await new Promise((resolve, reject) => {
        ws.on('open', () => {
            ws.end('', resolve);
        });
        ws.on('error', reject);
    });

    logger.debug('Pipeline run log file created', { runId, logPath });
    return logPath;
}

const appendStreams = new Map();

function getOrCreateAppendStream(logPath) {
    if (appendStreams.has(logPath)) {
        return appendStreams.get(logPath);
    }

    const stream = createWriteStream(logPath, { flags: 'a', encoding: 'utf8' });
    stream.on('error', (err) => {
        logger.error('Append stream error', { logPath, error: err.message });
        appendStreams.delete(logPath);
    });

    appendStreams.set(logPath, stream);
    return stream;
}

export function appendLogLine(logPath, line) {
    if (!logPath || !line) return;

    try {
        const stream = getOrCreateAppendStream(logPath);
        stream.write(line + '\n');
    } catch (err) {
        logger.error('Failed to append pipeline run log line', { logPath, error: err.message });
    }
}

export function closeAppendStream(logPath) {
    if (!logPath) return;
    const stream = appendStreams.get(logPath);
    if (stream) {
        stream.end();
        appendStreams.delete(logPath);
    }
}

export async function readLogFile(logPath) {
    if (!logPath || !existsSync(logPath)) {
        return '';
    }

    // T6: Block path traversal — only allow reads within STORAGE_DIR
    if (!resolve(logPath).startsWith(RESOLVED_STORAGE_DIR)) {
        logger.warn('Blocked log path traversal attempt (readLogFile)', { logPath });
        return '';
    }

    try {
        return await readFile(logPath, 'utf8');
    } catch (err) {
        logger.error('Failed to read pipeline run log file', { logPath, error: err.message });
        return '';
    }
}

export function createLogReadStream(logPath, options = {}) {
    if (!logPath || !existsSync(logPath)) {
        return null;
    }

    // T6: Block path traversal — only allow reads within STORAGE_DIR
    if (!resolve(logPath).startsWith(RESOLVED_STORAGE_DIR)) {
        logger.warn('Blocked log path traversal attempt (createLogReadStream)', { logPath });
        return null;
    }

    return fsCreateReadStream(logPath, { encoding: 'utf8', ...options });
}

export async function getLogSize(logPath) {
    if (!logPath || !existsSync(logPath)) {
        return 0;
    }

    try {
        const stats = await stat(logPath);
        return stats.size;
    } catch (err) {
        logger.error('Failed to stat pipeline run log file', { logPath, error: err.message });
        return 0;
    }
}
