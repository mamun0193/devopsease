export function validatePipeline(artifacts) {
    const warnings = [];
    let score = 100;

    if (!artifacts || !artifacts.pipeline || Object.keys(artifacts.pipeline).length === 0) {
        return { score: 100, warnings, isValid: true };
    }

    const pipelineContent = Object.values(artifacts.pipeline).join('\n');
    
    if (!pipelineContent.includes('build') && !pipelineContent.includes('deploy')) {
        warnings.push("Pipeline configuration appears to be missing build or deploy stages.");
        score -= 20;
    }

    const isValid = score >= 50;
    return { score: Math.max(0, score), warnings, isValid };
}
