export function validateCompose(artifacts) {
    const warnings = [];
    let score = 100;

    if (!artifacts || !artifacts.compose || !artifacts.compose.content) {
        warnings.push("No docker-compose.yml found.");
        return { score: 0, warnings, isValid: false };
    }

    const content = artifacts.compose.content;
    
    if (!content.includes('services:')) {
        warnings.push("docker-compose.yml is missing 'services' block.");
        score -= 100;
    }

    // Checking for cycles or duplicate ports would require a YAML parser.
    // Assuming simple regex checks for now as a baseline
    if (content.includes('depends_on:')) {
        // Just a basic check
    }

    const isValid = score >= 50;
    return { score: Math.max(0, score), warnings, isValid };
}
