import ConfigEntry from '../models/configEntry.model.js';
import Application from '../models/application.model.js';
import Repository from '../models/repository.model.js';
import { scanEnvironmentVariables } from '../intelligence/envScanner.js';
import { getWorkspacePath, validateSafePath, isClonedRepo } from '../utils/workspace.js';
import Environment from '../models/env.model.js';
import logger from '../utils/logger.js';

/**
 * Configuration Readiness Engine
 *
 * Compares detected requirements (from env scanner) against configured
 * values (from ConfigEntry). Produces multi-dimensional readiness scores
 * and intelligent suggestions.
 */

// Secret Classification (mirrors envScanner.js) 

const SECRET_PATTERNS = [
    'PASSWORD', 'SECRET', 'TOKEN', 'PRIVATE_KEY', 'ACCESS_KEY', 'API_KEY',
    'CREDENTIAL', 'AUTH', 'DSN', 'DATABASE_URL', 'REDIS_URL', 'MONGO_URI',
    'CONNECTION_STRING', 'CERTIFICATE', 'SMTP',
];

function looksLikeSecret(name) {
    const upper = name.toUpperCase();
    return SECRET_PATTERNS.some(p => upper.includes(p));
}

// Intelligent Suggestions 

function generateSuggestions(detected, configured, configuredMap) {
    const suggestions = [];

    // 1. Missing required variables
    for (const d of detected) {
        const isConfigured = configuredMap.has(d.name);
        if (!isConfigured && d.confidence >= 0.7) {
            suggestions.push({
                type: d.isSecret ? 'missing_secret' : 'missing_variable',
                severity: d.confidence >= 0.9 ? 'error' : 'warning',
                key: d.name,
                message: d.isSecret
                    ? `Detected ${d.name} in source code but no secret is configured.`
                    : `Detected ${d.name} in source code but no variable is configured.`,
                action: d.isSecret ? 'add_secret' : 'add_variable',
                confidence: d.confidence,
                requiredBy: d.requiredBy || [],
                defaultValue: d.defaultValue || null,
            });
        }
    }

    // 2. Misclassified entries (variable stored as wrong type)
    for (const entry of configured) {
        const shouldBeSecret = looksLikeSecret(entry.name);
        if (shouldBeSecret && entry.type === 'variable') {
            suggestions.push({
                type: 'misclassified',
                severity: 'warning',
                key: entry.name,
                message: `${entry.name} is stored as a Variable but looks like a Secret. Consider reclassifying it.`,
                action: 'reclassify',
                currentType: 'variable',
                suggestedType: 'secret',
            });
        }
    }

    // 3. Common environment variables that should always be set
    const commonRequired = ['NODE_ENV', 'PORT'];
    for (const key of commonRequired) {
        if (!configuredMap.has(key)) {
            const detectedVar = detected.find(d => d.name === key);
            if (detectedVar) {
                suggestions.push({
                    type: 'missing_variable',
                    severity: 'info',
                    key,
                    message: `${key} is referenced in code but not configured for this environment.`,
                    action: 'add_variable',
                    defaultValue: detectedVar.defaultValue || null,
                });
            }
        }
    }

    return suggestions;
}

// Readiness Score Calculation 

function calculateScores(detected, configured, missing, misclassified) {
    const totalDetected = detected.length || 1; // avoid divide-by-zero
    const totalConfigured = configured.length;
    const missingCount = missing.length;
    const misclassifiedCount = misclassified.length;

    // Security: % of secrets properly encrypted + classified
    const secretEntries = configured.filter(e => e.type === 'secret');
    const encryptedSecrets = secretEntries.filter(e => e.encrypted);
    const securityScore = secretEntries.length > 0
        ? Math.round((encryptedSecrets.length / secretEntries.length) * 100)
        : 100;

    // Adjust for misclassified (variables that should be secrets)
    const securityPenalty = Math.min(misclassifiedCount * 5, 30);
    const adjustedSecurity = Math.max(0, securityScore - securityPenalty);

    // Configuration: % of detected variables that are configured
    const satisfiedCount = detected.filter(d =>
        configured.some(c => c.name === d.name),
    ).length;
    const configurationScore = Math.round((satisfiedCount / totalDetected) * 100);

    // Deployment: all critical vars present
    const criticalMissing = missing.filter(m => m.confidence >= 0.9);
    const deploymentScore = criticalMissing.length === 0 ? 100 : Math.max(0, 100 - (criticalMissing.length * 20));

    // Environment: completeness for this specific environment
    const environmentScore = missingCount === 0
        ? 100
        : Math.round(((totalDetected - missingCount) / totalDetected) * 100);

    // Overall: weighted average
    const overall = Math.round(
        (adjustedSecurity * 0.25) +
        (configurationScore * 0.30) +
        (deploymentScore * 0.25) +
        (environmentScore * 0.20),
    );

    return {
        security: adjustedSecurity,
        configuration: configurationScore,
        deployment: deploymentScore,
        environment: environmentScore,
        overall,
    };
}

// Main Readiness Report 

// Generate a comprehensive readiness report for a repository + environment.

export async function getReadinessReport(repositoryId, environmentId) {
    // 1. Resolve Repository → Workspace
    const repo = await Repository.findById(repositoryId).lean();
    if (!repo) {
        throw Object.assign(new Error('Repository not found'), {
            statusCode: 404, errorCode: 'NOT_FOUND',
        });
    }

    const env = await Environment.findById(environmentId).lean();

    // 2. Run scanner (if workspace is available)
    let scanResult = { variables: [], metadata: {} };
    if (repo) {
        try {
            const workspacePath = getWorkspacePath(repo.userId, repo._id);
            validateSafePath(workspacePath);
            if (isClonedRepo(workspacePath)) {
                scanResult = await scanEnvironmentVariables(workspacePath);
            }
        } catch (err) {
            logger.warn('Readiness scanner failed — workspace may not be cloned', {
                repositoryId: String(repositoryId),
                error: err.message,
            });
        }
    }

    const detected = scanResult.variables;

    // 3. Get configured entries for this repository + environment
    const configured = await ConfigEntry.find({
        repositoryId,
        environmentId,
    }).lean();

    const configuredMap = new Map(configured.map(e => [e.name, e]));

    // 4. Gap analysis
    const missing = detected.filter(d => !configuredMap.has(d.name) && d.confidence >= 0.5);
    const unused = configured.filter(c => !detected.some(d => d.name === c.name));

    // 5. Misclassification detection
    const misclassified = configured.filter(c => {
        const shouldBeSecret = looksLikeSecret(c.name);
        return (shouldBeSecret && c.type === 'variable') ||
               (!shouldBeSecret && c.type === 'secret' && !c.name.includes('KEY'));
    }).map(c => ({
        name: c.name,
        currentType: c.type,
        suggestedType: looksLikeSecret(c.name) ? 'secret' : 'variable',
        reason: looksLikeSecret(c.name)
            ? `${c.name} matches secret naming patterns`
            : `${c.name} does not match typical secret patterns`,
    }));

    // 6. Calculate multi-dimensional scores
    const scores = calculateScores(detected, configured, missing, misclassified);

    // 7. Generate intelligent suggestions
    const suggestions = generateSuggestions(detected, configured, configuredMap);

    // 8. Determine deployment readiness
    const criticalMissing = missing.filter(m => m.confidence >= 0.9 && m.isSecret);
    const deploymentReady = criticalMissing.length === 0 && scores.overall >= 60;

    return {
        detected: detected.map(d => ({
            name: d.name,
            confidence: d.confidence,
            isSecret: d.isSecret,
            source: d.source,
            requiredBy: d.requiredBy || [],
            defaultValue: d.defaultValue,
            heuristic: d.heuristic,
            sourceFile: d.sourceFile,
            lineNumber: d.lineNumber,
        })),

        configured: configured.map(c => ({
            name: c.name,
            type: c.type,
            version: c.version,
            source: c.source,
            lastUpdated: c.updatedAt,
        })),

        missing: missing.map(m => ({
            name: m.name,
            isSecret: m.isSecret,
            requiredBy: m.requiredBy || [],
            confidence: m.confidence,
            defaultValue: m.defaultValue,
        })),

        unused: unused.map(u => ({
            name: u.name,
            type: u.type,
            source: u.source,
        })),

        misclassified,

        scores,
        deploymentReady,

        warnings: [
            ...unused.length > 0
                ? [`${unused.length} configured variable(s) not detected in source code`]
                : [],
            ...misclassified.length > 0
                ? [`${misclassified.length} variable(s) may be misclassified`]
                : [],
        ],

        errors: criticalMissing.map(m =>
            `Missing required secret: ${m.name} (confidence: ${Math.round(m.confidence * 100)}%)`,
        ),

        suggestions,

        scanMetadata: scanResult.metadata,
    };
}

export default { getReadinessReport };
