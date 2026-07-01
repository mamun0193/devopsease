import docker from '../docker/client.js';
import { detectProjectType } from './projectDetector.service.js';
import Repository from '../models/repository.model.js';

/**
 * Extracts metadata from a built Docker image and enriches it with Intelligence Engine data.
 * @param {string} dockerImageId - The Docker Image ID (e.g., sha256:...)
 * @param {string} repoId - The repository ID for intelligence context
 * @returns {Promise<Object>} The enriched metadata object
 */
export async function extractImageMetadata(dockerImageId, repoId = null) {
    let inspectData;
    try {
        const image = docker.getImage(dockerImageId);
        inspectData = await image.inspect();
    } catch (err) {
        throw new Error(`Failed to inspect image ${dockerImageId}: ${err.message}`);
    }

    const { Architecture, Os, Size, Config, RootFS } = inspectData;

    // Base Docker metadata
    const metadata = {
        architecture: Architecture || null,
        os: Os || null,
        sizeMB: Size ? parseFloat((Size / (1024 * 1024)).toFixed(2)) : 0,
        entrypoint: Config?.Entrypoint || [],
        cmd: Config?.Cmd || [],
        labels: Config?.Labels || {},
        environment: Config?.Env || [],
        volumes: Config?.Volumes ? Object.keys(Config.Volumes) : [],
        exposedPorts: Config?.ExposedPorts ? Object.keys(Config.ExposedPorts) : [],
        layerCount: RootFS?.Layers?.length || 0,
        layers: (RootFS?.Layers || []).map(layer => ({ digest: layer, size: 0 })) // Size would need separate history parsing
    };

    // Intelligence Engine enrichment
    let intelligence = {
        runtime: null,
        framework: null,
        language: null,
        buildStrategy: null
    };

    if (repoId) {
        try {
            const repo = await Repository.findById(repoId);
            if (repo && repo.path) {
                const projectInfo = await detectProjectType(repo.path);
                if (projectInfo.type === 'node') {
                    intelligence.language = 'Node.js';
                    intelligence.runtime = 'Node';
                    intelligence.framework = projectInfo.node?.name || null;
                } else if (projectInfo.type === 'python') {
                    intelligence.language = 'Python';
                }
            }
        } catch (err) {
            console.warn(`Could not extract intelligence for repo ${repoId}:`, err.message);
        }
    }

    // Fallback heuristics based on Docker inspect if Intelligence Engine couldn't find it
    if (!intelligence.language) {
        if (metadata.environment.some(env => env.startsWith('NODE_VERSION='))) {
            intelligence.language = 'Node.js';
            intelligence.runtime = 'Node';
        } else if (metadata.environment.some(env => env.startsWith('PYTHON_VERSION='))) {
            intelligence.language = 'Python';
            intelligence.runtime = 'Python';
        }
    }

    return {
        ...metadata,
        ...intelligence
    };
}

export default {
    extractImageMetadata
};
