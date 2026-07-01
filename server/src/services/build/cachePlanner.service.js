import crypto from 'crypto';

export function planBuildCache(currentContext, previousManifest) {
    // Generate ultimate build fingerprint
    const hash = crypto.createHash('sha256');
    hash.update(currentContext.repoId.toString());
    hash.update(currentContext.branch || '');
    hash.update(currentContext.contextHash || '');
    hash.update(currentContext.dependencyFingerprint || '');
    hash.update(currentContext.dockerfileFingerprint || '');
    const buildFingerprint = hash.digest('hex');

    const result = {
        buildFingerprint,
        strategy: 'FULL_REBUILD',
        invalidationReason: null,
        estimatedSavedTimeMs: 0,
        layers: currentContext.layers || [],
        comparison: {
            previousBuildId: null,
            dependencyChanges: true,
            dockerfileChanges: true,
            contextChanged: true,
            estimatedSavedTimeMs: 0
        }
    };

    if (!previousManifest) {
        result.invalidationReason = 'NO_PREVIOUS_BUILD';
        return result;
    }

    result.comparison.previousBuildId = previousManifest.buildId;
    
    const contextChanged = currentContext.contextHash !== previousManifest.contextHash;
    const depsChanged = currentContext.dependencyFingerprint !== previousManifest.dependencyFingerprint;
    const dockerfileChanged = currentContext.dockerfileFingerprint !== previousManifest.dockerfileFingerprint;
    
    result.comparison.contextChanged = contextChanged;
    result.comparison.dependencyChanges = depsChanged;
    result.comparison.dockerfileChanges = dockerfileChanged;

    // Generate rolling cache keys
    let parentCacheKey = '';
    result.layers = result.layers.map(l => {
        const hash = crypto.createHash('sha256');
        hash.update(parentCacheKey);
        hash.update(l.instructionHash || '');
        if (l.layerType === 'DEPENDENCY') hash.update(currentContext.dependencyFingerprint || '');
        if (l.layerType === 'SOURCE') hash.update(currentContext.contextHash || '');
        
        const cacheKey = hash.digest('hex');
        parentCacheKey = cacheKey; // rolling forward
        return { ...l, cacheKey };
    });

    if (buildFingerprint === previousManifest.buildFingerprint) {
        result.strategy = 'FULL_REUSE';
        result.invalidationReason = null;
        result.estimatedSavedTimeMs = 30000; // Will be dynamic later
        
        // All layers hit
        result.layers = result.layers.map(l => ({ 
            ...l, 
            cacheStatus: 'HIT',
            reason: 'Perfect cache hit. Context, dependencies, and Dockerfile are identical to previous build.' 
        }));
        result.comparison.estimatedSavedTimeMs = result.estimatedSavedTimeMs;
        return result;
    }

    if (dockerfileChanged) {
        result.strategy = 'FULL_REBUILD';
        result.invalidationReason = 'DOCKERFILE_CHANGED';
        result.layers = result.layers.map(l => ({ 
            ...l, 
            cacheStatus: 'MISS',
            reason: 'Cache missed because the Dockerfile instructions were modified.'
        }));
        return result;
    }

    if (depsChanged) {
        result.strategy = 'PARTIAL_REUSE';
        result.invalidationReason = 'DEPENDENCIES_CHANGED';
        let foundMiss = false;
        result.layers = result.layers.map(l => {
            if (foundMiss) return { ...l, cacheStatus: 'MISS', reason: 'Cache missed because a parent layer missed.' };
            if (l.layerType === 'DEPENDENCY' || l.layerType === 'SOURCE') {
                foundMiss = true;
                return { ...l, cacheStatus: 'MISS', reason: 'Dependency signatures drifted since last build.' };
            }
            return { ...l, cacheStatus: 'HIT', reason: 'Layer hit (prior to dependency install).' };
        });
        result.estimatedSavedTimeMs = 5000; 
        result.comparison.estimatedSavedTimeMs = 5000;
        return result;
    }

    if (contextChanged) {
        result.strategy = 'PARTIAL_REUSE';
        result.invalidationReason = 'CONTEXT_CHANGED';
        let foundMiss = false;
        result.layers = result.layers.map(l => {
            if (foundMiss) return { ...l, cacheStatus: 'MISS', reason: 'Cache missed because a parent layer missed.' };
            if (l.layerType === 'SOURCE') {
                foundMiss = true;
                return { ...l, cacheStatus: 'MISS', reason: 'Source code context changed.' };
            }
            return { ...l, cacheStatus: 'HIT', reason: 'Layer hit (prior to source code modification).' };
        });
        result.estimatedSavedTimeMs = 15000;
        result.comparison.estimatedSavedTimeMs = 15000;
        return result;
    }

    return result;
}
