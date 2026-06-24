import { v4 as uuidv4 } from 'uuid';
import { generateBlueprint } from '../blueprints/blueprint.service.js';
import ArtifactBundle from '../models/artifactBundle.model.js';
import logger from '../utils/logger.js';

import { buildArtifactSpecification } from './spec.builder.js';
import { generateDockerfiles } from './docker/dockerfile.generator.js';
import { generateDockerIgnores } from './docker/dockerignore.generator.js';
import { generateCompose } from './compose/compose.generator.js';
import { generateKubernetes } from './kubernetes/kubernetes.generator.js';
import { generatePipeline } from './pipeline/pipeline.generator.js';
import { generateEnvironment } from './environment/env.generator.js';
import { generateHealthchecks } from './healthcheck/healthcheck.generator.js';
import { generateProxy } from './proxy/nginx.generator.js';

function computeCostEstimate(spec) {
    let totalCost = 0;
    const details = {};
    for (const service of spec.services) {
        // Dummy heuristic: $10 per instance
        const cost = 10.00;
        totalCost += cost;
        details[service.name] = cost;
    }
    return {
        totalMonthly: totalCost,
        currency: 'USD',
        details
    };
}

export async function generateArtifacts(repoId) {
    logger.info(`Starting artifact generation for repo: ${repoId}`);
    
    // 1. Generate Deployment Blueprint (Single Source of Truth)
    const blueprint = await generateBlueprint(repoId);

    // 2. Initialize Artifact Bundle
    const artifactBundle = {
        repoId,
        blueprintId: blueprint.metadata.blueprintId,
        blueprintVersion: blueprint.metadata.version,
        dockerfiles: [],
        dockerignore: [],
        compose: {},
        kubernetes: {},
        pipeline: {},
        environment: {},
        healthchecks: {},
        proxy: {},
        warnings: [...blueprint.warnings],
        costEstimate: {}
    };

    try {
        // 3. Artifact Specification Layer (Intermediate)
        const spec = buildArtifactSpecification(blueprint, artifactBundle.warnings);

        // 4. Invoke Generators (consuming spec)
        artifactBundle.dockerfiles = generateDockerfiles(spec, artifactBundle.warnings);
        artifactBundle.dockerignore = generateDockerIgnores(spec);
        artifactBundle.compose = generateCompose(spec, artifactBundle.warnings);
        artifactBundle.kubernetes = generateKubernetes(spec, artifactBundle.warnings);
        artifactBundle.pipeline = generatePipeline(spec);
        artifactBundle.environment = generateEnvironment(spec);
        artifactBundle.healthchecks = generateHealthchecks(spec, artifactBundle.warnings);
        artifactBundle.proxy = generateProxy(spec);
        artifactBundle.costEstimate = computeCostEstimate(spec);

        // 5. Artifact Validation (Basic check)
        if (!artifactBundle.dockerfiles.length) {
            artifactBundle.warnings.push("Validation Warning: No Dockerfiles generated.");
        }

        // 6. Persistence
        const savedBundle = await ArtifactBundle.findOneAndUpdate(
            { repoId, blueprintVersion: blueprint.metadata.version },
            artifactBundle,
            { upsert: true, new: true }
        );

        logger.info(`Successfully generated artifact bundle for repo: ${repoId}`);
        return savedBundle;

    } catch (error) {
        logger.error(`Artifact generation failed for repo ${repoId}:`, error);
        throw error;
    }
}
