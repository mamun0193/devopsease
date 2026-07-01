import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const DEPENDENCY_FILES = [
    // Node.js
    'package.json',
    'package-lock.json',
    'yarn.lock',
    'pnpm-lock.yaml',
    // Python
    'requirements.txt',
    'poetry.lock',
    'Pipfile.lock',
    // Go
    'go.mod',
    'go.sum',
    // Java
    'pom.xml',
    'build.gradle',
    'build.gradle.kts',
];

export async function computeDependencyFingerprint(workspacePath) {
    const hash = crypto.createHash('sha256');
    let hasDependencies = false;

    // Sort to ensure deterministic hashing order
    const sortedDeps = [...DEPENDENCY_FILES].sort();

    for (const depFile of sortedDeps) {
        const fullPath = path.join(workspacePath, depFile);
        try {
            const content = await fs.readFile(fullPath);
            hash.update(`${depFile}:`);
            hash.update(content);
            hasDependencies = true;
        } catch (err) {
            // File does not exist or cannot be read, ignore
        }
    }

    if (!hasDependencies) {
        return null; // No known dependency files found
    }

    return hash.digest('hex');
}
