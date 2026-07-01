import fs from 'fs/promises';
import { createReadStream } from 'fs';
import path from 'path';
import crypto from 'crypto';
import ignore from 'ignore';

const MAX_FILES = 50000;
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB per file hash limit

export async function computeContextHash(workspacePath) {
    let fileCount = 0;
    const ig = ignore();
    
    // Default ignores for safety and performance
    ig.add(['.git', 'node_modules', '.DS_Store', 'workspace', 'storage', 'dist', 'build']);

    try {
        const dockerignorePath = path.join(workspacePath, '.dockerignore');
        const dockerignoreContent = await fs.readFile(dockerignorePath, 'utf8');
        ig.add(dockerignoreContent);
    } catch (err) {
        // Ignore if .dockerignore doesn't exist
    }

    const hash = crypto.createHash('sha256');

    async function processDirectory(currentPath, relativePath = '') {
        const entries = await fs.readdir(currentPath, { withFileTypes: true });

        // Sort for deterministic hashing
        entries.sort((a, b) => a.name.localeCompare(b.name));

        for (const entry of entries) {
            const entryRelativePath = relativePath ? `${relativePath}/${entry.name}` : entry.name;
            
            // Skip ignored
            if (ig.ignores(entryRelativePath)) {
                continue;
            }

            const entryFullPath = path.join(currentPath, entry.name);
            
            // Security: Prevent symlink traversal outside workspace
            if (entry.isSymbolicLink()) {
                continue;
            }

            if (entry.isDirectory()) {
                await processDirectory(entryFullPath, entryRelativePath);
            } else if (entry.isFile()) {
                fileCount++;
                if (fileCount > MAX_FILES) {
                    throw new Error(`Context hashing exceeded maximum file limit of ${MAX_FILES}`);
                }

                // Check size
                const stats = await fs.stat(entryFullPath);
                if (stats.size > MAX_FILE_SIZE) {
                    // Skip hashing huge files to prevent resource exhaustion, just hash name/size
                    hash.update(`${entryRelativePath}:${stats.size}`);
                    continue;
                }

                hash.update(entryRelativePath);
                
                // Read file content for hashing
                const fileHash = await hashFile(entryFullPath);
                hash.update(fileHash);
            }
        }
    }

    await processDirectory(workspacePath);
    return hash.digest('hex');
}

function hashFile(filePath) {
    return new Promise((resolve, reject) => {
        const fileHash = crypto.createHash('sha256');
        const stream = createReadStream(filePath);
        stream.on('data', data => fileHash.update(data));
        stream.on('end', () => resolve(fileHash.digest('hex')));
        stream.on('error', reject);
    });
}
