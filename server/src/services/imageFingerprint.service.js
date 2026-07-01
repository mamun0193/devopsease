import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

/**
 * Generates an MD5 hash of a file's contents
 * @param {string} filePath 
 * @returns {Promise<string|null>}
 */
async function hashFile(filePath) {
    if (!fs.existsSync(filePath)) return null;
    return new Promise((resolve) => {
        const hash = crypto.createHash('sha256');
        const stream = fs.createReadStream(filePath);
        stream.on('data', (data) => hash.update(data));
        stream.on('end', () => resolve(hash.digest('hex')));
        stream.on('error', () => resolve(null));
    });
}

/**
 * Prepares image fingerprints for future BuildKit caching support.
 * @param {string} buildContextPath - Path to the build context
 * @returns {Promise<Object>} The fingerprint hashes
 */
export async function generateFingerprints(buildContextPath) {
    if (!buildContextPath) {
        return {
            dockerfileHash: null,
            buildContextHash: null,
            dependencyHash: null,
            blueprintVersion: null,
            artifactRevision: null,
            configSnapshotVersion: null
        };
    }

    const dockerfileHash = await hashFile(path.join(buildContextPath, 'Dockerfile'));
    
    // We can expand this later to hash package-lock.json, requirements.txt, etc.
    let dependencyHash = null;
    const packageLockPath = path.join(buildContextPath, 'package-lock.json');
    const requirementsPath = path.join(buildContextPath, 'requirements.txt');
    
    if (fs.existsSync(packageLockPath)) {
        dependencyHash = await hashFile(packageLockPath);
    } else if (fs.existsSync(requirementsPath)) {
        dependencyHash = await hashFile(requirementsPath);
    }

    return {
        dockerfileHash,
        buildContextHash: null, // Full context hashing is expensive, stub for now
        dependencyHash,
        blueprintVersion: null, // To be populated by Blueprint Engine later
        artifactRevision: null, // To be populated by Artifact Platform later
        configSnapshotVersion: null
    };
}

export default {
    generateFingerprints
};
