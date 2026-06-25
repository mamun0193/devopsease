export function validateEnvironment(artifacts) {
    const warnings = [];
    let score = 100;

    if (!artifacts || !artifacts.environment || !artifacts.environment.content) {
        return { score: 100, warnings, isValid: true };
    }

    const envContent = artifacts.environment.content;
    
    // Check for duplicate variables
    const lines = envContent.split('\n').filter(l => l.trim() && !l.startsWith('#'));
    const seen = new Set();
    
    for (const line of lines) {
        const parts = line.split('=');
        if (parts.length >= 2) {
            const key = parts[0].trim();
            if (seen.has(key)) {
                warnings.push(`Duplicate environment variable found: ${key}`);
                score -= 10;
            }
            seen.add(key);
        }
    }

    const isValid = score >= 50;
    return { score: Math.max(0, score), warnings, isValid };
}
