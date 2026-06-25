export function validateDocker(artifacts) {
    const warnings = [];
    let score = 100;
    
    if (!artifacts || !artifacts.dockerfiles || artifacts.dockerfiles.length === 0) {
        warnings.push("No Dockerfiles found.");
        return { score: 0, warnings, isValid: false };
    }

    // Basic checks
    for (const df of artifacts.dockerfiles) {
        if (!df.content.includes('FROM ')) {
            warnings.push(`Dockerfile ${df.path} is missing FROM instruction.`);
            score -= 50;
        }
        if (!df.content.includes('ENTRYPOINT') && !df.content.includes('CMD')) {
            warnings.push(`Dockerfile ${df.path} is missing ENTRYPOINT or CMD.`);
            score -= 20;
        }
        if (!df.content.includes('USER ')) {
            warnings.push(`Dockerfile ${df.path} does not specify a non-root USER.`);
            score -= 10; // Security best practice
        }
    }

    const isValid = score >= 50;
    return { score: Math.max(0, score), warnings, isValid };
}
