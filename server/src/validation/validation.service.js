import { validateDocker } from './docker.validator.js';
import { validateCompose } from './compose.validator.js';
import { validateKubernetes } from './kubernetes.validator.js';
import { validatePipeline } from './pipeline.validator.js';
import { validateEnvironment } from './environment.validator.js';

export function runValidation(artifactBundleOrRevision) {
    // Determine the source of artifacts
    // For a generated bundle, the artifacts are at the root
    // For a revision, the edited artifacts are inside editedArtifacts, falling back to the original bundle
    const source = artifactBundleOrRevision.editedArtifacts 
        && Object.keys(artifactBundleOrRevision.editedArtifacts).length > 0
        ? { ...artifactBundleOrRevision._doc, ...artifactBundleOrRevision.editedArtifacts }
        : artifactBundleOrRevision;

    const dockerResult = validateDocker(source);
    const composeResult = validateCompose(source);
    const k8sResult = validateKubernetes(source);
    const pipelineResult = validatePipeline(source);
    const envResult = validateEnvironment(source);

    // Calculate an overall readiness score based on weights
    // Here we're using a simple average of the individual scores,
    // assuming they are all equally important. 
    // In a real scenario, weights could be applied.
    
    const scores = [dockerResult.score, composeResult.score, k8sResult.score, pipelineResult.score, envResult.score];
    const totalScore = Math.floor(scores.reduce((a, b) => a + b, 0) / scores.length);

    const allWarnings = [
        ...dockerResult.warnings,
        ...composeResult.warnings,
        ...k8sResult.warnings,
        ...pipelineResult.warnings,
        ...envResult.warnings
    ];

    const isValid = dockerResult.isValid && composeResult.isValid && 
                    k8sResult.isValid && pipelineResult.isValid && envResult.isValid;

    return {
        scores: {
            docker: dockerResult.score,
            compose: composeResult.score,
            kubernetes: k8sResult.score,
            pipeline: pipelineResult.score,
            environment: envResult.score,
            security: 100 // placeholder for future security validator
        },
        readinessScore: totalScore,
        warnings: allWarnings,
        isValid
    };
}
