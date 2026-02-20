const FAILURE_PATTERNS = [
    {
        type: 'BUILD_BASE_IMAGE_MISSING',
        patterns: [
            /pull access denied/i,
            /repository does not exist/i,
            /manifest unknown/i,
            /not found: manifest unknown/i,
            /image .+ not found/i
        ],
        explanation: 'The specified base image could not be pulled from the registry.',
        confidence: 0.9
    },
    {
        type: 'BUILD_SYNTAX_ERROR',
        patterns: [
            /unknown instruction/i,
            /syntax error/i,
            /failed to parse/i,
            /dockerfile parse error/i,
            /unexpected token/i
        ],
        explanation: 'There is a syntax error in the Dockerfile.',
        confidence: 0.9
    },
    {
        type: 'BUILD_RESOURCE_EXHAUSTION',
        patterns: [
            /cannot allocate memory/i,
            /out of memory/i,
            /killed/i,
            /oom/i
        ],
        explanation: 'The build failed due to insufficient system resources.',
        confidence: 0.9
    },
    {
        type: 'BUILD_PERMISSION_DENIED',
        patterns: [
            /permission denied/i,
            /operation not permitted/i,
            /access denied/i
        ],
        explanation: 'A permission error occurred during build execution.',
        confidence: 0.9
    },
    {
        type: 'BUILD_DISK_SPACE',
        patterns: [
            /no space left on device/i,
            /disk quota exceeded/i
        ],
        explanation: 'The build failed because the system ran out of disk space.',
        confidence: 0.95
    }
];

const FAILURE_LABELS = {
    BUILD_SYNTAX_ERROR: 'Syntax Error',
    BUILD_RESOURCE_EXHAUSTION: 'Resource Exhaustion',
    BUILD_BASE_IMAGE_MISSING: 'Base Image Missing',
    BUILD_PERMISSION_DENIED: 'Permission Denied',
    BUILD_DISK_SPACE: 'Disk Space',
    BUILD_TIMEOUT: 'Build Timeout',
    BUILD_UNKNOWN: 'Unknown Failure'
};

function extractFailingStage(logLines) {
    const stepRegex = /Step\s+\d+\/\d+\s*:\s*(.*)/i;
    for (let i = logLines.length - 1; i >= 0; i--) {
        const match = logLines[i].match(stepRegex);
        if (match) return match[0];
    }
    return null;
}

function analyzeBuildFailure(logLines = [], status) {
    if (status === 'TIMEOUT') {
        return {
            type: 'BUILD_TIMEOUT',
            confidence: 1.0,
            explanation: 'The build exceeded the maximum allowed time.',
            evidence: [],
            failingStage: extractFailingStage(logLines)
        };
    }

    for (const rule of FAILURE_PATTERNS) {
        const matchedEvidence = logLines.filter(line =>
            rule.patterns.some(pattern => pattern.test(line))
        );

        if (matchedEvidence.length > 0) {
            return {
                type: rule.type,
                confidence: rule.confidence,
                explanation: rule.explanation,
                evidence: matchedEvidence.slice(0, 5),
                failingStage: extractFailingStage(logLines)
            };
        }
    }

    return {
        type: 'BUILD_UNKNOWN',
        confidence: 0.4,
        explanation: 'The build failed for an unknown reason.',
        evidence: logLines.slice(-5),
        failingStage: extractFailingStage(logLines)
    };
}

export { analyzeBuildFailure, FAILURE_LABELS };
