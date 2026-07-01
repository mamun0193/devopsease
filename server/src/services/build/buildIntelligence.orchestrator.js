import path from 'path';
import fs from 'fs/promises';
import BuildManifest from '../../models/buildManifest.model.js';
import { computeContextHash } from './buildContext.service.js';
import { computeDependencyFingerprint } from './buildDependency.service.js';
import { computeDockerfileFingerprint, analyzeDockerfileLayers } from './dockerfileAnalyzer.service.js';
import { planBuildCache } from './cachePlanner.service.js';
import logger from '../../utils/logger.js';
import { logBuildEvent, BUILD_EVENTS } from '../build.audit.js';
import domainEvents, { DOMAIN_EVENTS } from '../../system/domainEvents.js';

export async function orchestrateBuildIntelligence(repoId, userId, workspacePath, branch, commitSha, dockerfileContent) {
    logger.info(`Starting build intelligence orchestration for repo ${repoId}`);

    // Generate Fingerprints
    const contextHash = await computeContextHash(workspacePath).catch(err => {
        logger.warn(`Failed to compute context hash: ${err.message}`);
        return null;
    });
    
    if (contextHash) {
        domainEvents.emitDomainEvent(DOMAIN_EVENTS.BUILD_CONTEXT_HASHED, { repoId, contextHash, branch });
    }

    const dependencyFingerprint = await computeDependencyFingerprint(workspacePath).catch(err => {
        logger.warn(`Failed to compute dependency fingerprint: ${err.message}`);
        return null;
    });

    if (dependencyFingerprint) {
        domainEvents.emitDomainEvent(DOMAIN_EVENTS.DEPENDENCIES_ANALYZED, { repoId, dependencyFingerprint, branch });
    }

    const dockerfileFingerprint = computeDockerfileFingerprint(dockerfileContent);
    const layers = analyzeDockerfileLayers(dockerfileContent);

    if (dockerfileFingerprint) {
        domainEvents.emitDomainEvent(DOMAIN_EVENTS.DOCKERFILE_ANALYZED, { repoId, dockerfileFingerprint, branch });
    }

    // Fetch previous successful build manifest for this branch
    const previousManifest = await BuildManifest.findOne({
        repoId,
        branch
    }).sort({ createdAt: -1 });

    const currentContext = {
        repoId,
        branch,
        commitSha,
        contextHash,
        dependencyFingerprint,
        dockerfileFingerprint,
        layers
    };

    // Plan Cache
    const plan = planBuildCache(currentContext, previousManifest);

    // Reuse identical manifest if the ultimate fingerprint matches
    let manifest;
    if (plan.strategy === 'FULL_REUSE' && previousManifest && previousManifest.buildFingerprint === plan.buildFingerprint) {
        logger.info(`Reusing existing identical manifest ${previousManifest._id} for repo ${repoId}`);
        manifest = previousManifest;
    } else {
        manifest = await BuildManifest.create({
            repoId,
            userId,
            branch,
            commitSha,
            contextHash,
            dependencyFingerprint,
            dockerfileFingerprint,
            buildFingerprint: plan.buildFingerprint,
            strategy: plan.strategy,
            invalidationReason: plan.invalidationReason,
            estimatedSavedTimeMs: plan.estimatedSavedTimeMs,
            layers: plan.layers,
            comparison: plan.comparison
        });
    }

    // Audit Event
    logBuildEvent({
        event: 'BUILD_MANIFEST_GENERATED',
        userId,
        metadata: { 
            manifestId: manifest._id,
            strategy: manifest.strategy
        }
    });

    domainEvents.emitDomainEvent(DOMAIN_EVENTS.CACHE_PLAN_READY, { 
        repoId, 
        manifestId: manifest._id, 
        strategy: manifest.strategy 
    });

    logger.info(`Build Intelligence plan ready for repo ${repoId}: ${manifest.strategy}`);

    return manifest;
}
