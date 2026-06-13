import { createWriteStream, createReadStream as fsCreateReadStream, existsSync } from 'fs';
import { mkdir, stat, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Resolve storage directory relative to the server root (two levels up from services/)
const STORAGE_DIR = join(__dirname, '..', '..', 'storage', 'build-logs');

// Ensure the storage directory exists (called once on first use).
 
let dirReady = false;
async function ensureStorageDir() {
    if (dirReady) return;
    await mkdir(STORAGE_DIR, { recursive: true });
    dirReady = true;
}

// Get the absolute filesystem path for a build's log file.
 
export function getLogPath(buildId) {
    return join(STORAGE_DIR, `${buildId}.log`);
}

// Initialize a log file for a new build.
// Returns the absolute path to the log file.

export async function initLogFile(buildId) {
    await ensureStorageDir();
    const logPath = getLogPath(buildId);

    // Create the file (or truncate if it somehow already exists)
    const ws = createWriteStream(logPath, { flags: 'w', encoding: 'utf8' });
    await new Promise((resolve, reject) => {
        ws.on('open', () => {
            ws.end('', resolve);
        });
        ws.on('error', reject);
    });

    logger.debug('Build log file created', { buildId, logPath });
    return logPath;
}

// Append a single line to a build's log file.
// Handles the newline separator automatically.

export function appendLogLine(logPath, line) {
    if (!logPath || !line) return;

    try {
        // Use a write stream in append mode.
        // For frequent small writes during a build, we reuse a cached stream.
        const stream = getOrCreateAppendStream(logPath);
        stream.write(line + '\n');
    } catch (err) {
        logger.error('Failed to append build log line', { logPath, error: err.message });
    }
}

// ── Append stream cache (one per active build) ──

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

// Close and remove the cached append stream for a build log.
// Call this when the build completes.

export function closeAppendStream(logPath) {
    if (!logPath) return;
    const stream = appendStreams.get(logPath);
    if (stream) {
        stream.end();
        appendStreams.delete(logPath);
    }
}

// Read the entire log file as a string.

export async function readLogFile(logPath) {
    if (!logPath || !existsSync(logPath)) {
        return '';
    }

    try {
        return await readFile(logPath, 'utf8');
    } catch (err) {
        logger.error('Failed to read build log file', { logPath, error: err.message });
        return '';
    }
}

// Create a readable stream for a build log file.

export function createLogReadStream(logPath, options = {}) {
    if (!logPath || !existsSync(logPath)) {
        return null;
    }

    return fsCreateReadStream(logPath, { encoding: 'utf8', ...options });
}

// Get the size of a log file in bytes.

export async function getLogSize(logPath) {
    if (!logPath || !existsSync(logPath)) {
        return 0;
    }

    try {
        const stats = await stat(logPath);
        return stats.size;
    } catch (err) {
        logger.error('Failed to stat build log file', { logPath, error: err.message });
        return 0;
    }
}
