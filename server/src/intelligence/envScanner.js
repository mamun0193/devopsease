import { readFile } from 'fs/promises';
import { join, extname } from 'path';
import { scanRepository } from './repositoryScanner.js';
import { detectServices } from './projectStructureDetector.js';
import logger from '../utils/logger.js';

/**
 * Environment Variable Scanner — Intelligence Engine Detector
 *
 * Scans cloned repository source code to detect required environment variables.
 * Extracts variable names, default values, confidence scores, source information,
 * and service attribution for monorepo support.
 *
 * Plugs into the existing Intelligence Engine pipeline alongside
 * frameworkDetector.js, runtimeDetector.js, etc.
 */

// Secret Classification Heuristics 

const SECRET_PATTERNS = [
    'PASSWORD', 'SECRET', 'TOKEN', 'PRIVATE_KEY', 'ACCESS_KEY', 'API_KEY',
    'CREDENTIAL', 'AUTH', 'DSN', 'DATABASE_URL', 'REDIS_URL', 'MONGO_URI',
    'CONNECTION_STRING', 'CERTIFICATE', 'SMTP', 'SENDGRID', 'STRIPE',
    'OPENAI', 'TWILIO',
];

// Framework-specific public prefixes (never secrets)
const PUBLIC_PREFIXES = [
    'NEXT_PUBLIC_', 'VITE_', 'REACT_APP_', 'NUXT_PUBLIC_', 'GATSBY_',
];

function classifyVariable(name, defaultValue, sourceFile, framework) {
    const upper = name.toUpperCase();
    let score = 0;
    const explanations = [];

    // Framework public variables are strictly variables
    for (const prefix of PUBLIC_PREFIXES) {
        if (upper.startsWith(prefix)) {
            return {
                type: 'variable',
                confidence: 1.0,
                explanation: `Starts with public framework prefix '${prefix}'`
            };
        }
    }

    // Keyword matching adds positive weight
    for (const pattern of SECRET_PATTERNS) {
        if (upper.includes(pattern)) {
            score += 0.8;
            explanations.push(`Contains secret keyword '${pattern}'`);
            break;
        }
    }

    // Check specific known public keywords that might trigger false positives
    if (upper === 'PORT' || upper.includes('HOST') || upper === 'NODE_ENV') {
        score -= 1.0;
        explanations.push(`Standard environment configuration key`);
    }

    // Default value analysis (if present)
    if (defaultValue) {
        if (defaultValue === 'true' || defaultValue === 'false' || !isNaN(Number(defaultValue))) {
            score -= 0.5; // Booleans/numbers are rarely secrets
            explanations.push(`Default value is a boolean or number`);
        } else if (defaultValue.length > 32 && !defaultValue.includes(' ')) {
            score += 0.5; // Long continuous strings look like hashes/keys
            explanations.push(`Default value resembles a secure hash or key`);
        }
    }

    // Final classification
    if (score >= 0.7) {
        return {
            type: 'secret',
            confidence: Math.min(score, 1.0),
            explanation: explanations.join(', ')
        };
    } else if (score <= 0.0) {
        return {
            type: 'variable',
            confidence: Math.min(Math.abs(score) + 0.5, 1.0),
            explanation: explanations.join(', ') || 'No sensitive patterns detected'
        };
    } else {
        return {
            type: 'unknown',
            confidence: 0.5,
            explanation: 'Ambiguous patterns detected, user confirmation required'
        };
    }
}

// Language-Specific Detection Patterns 

// Each detector returns an array of:
// { name, sourceFile, lineNumber, language, heuristic, defaultValue, confidence }

// Node.js: process.env.VAR, process.env['VAR'], with || and ?? defaults
const NODE_PATTERNS = [
    // process.env.VAR || 'default'
    /process\.env\.([A-Za-z_][A-Za-z0-9_]*)(?:\s*\|\|\s*['"`]([^'"`]*)['"`])?/g,
    // process.env.VAR ?? 'default'
    /process\.env\.([A-Za-z_][A-Za-z0-9_]*)(?:\s*\?\?\s*['"`]([^'"`]*)['"`])?/g,
    // process.env['VAR']
    /process\.env\[['"`]([A-Za-z_][A-Za-z0-9_]*)['"`]\]/g,
];

// Python: os.getenv('VAR', 'default'), os.environ.get('VAR', 'default'), os.environ['VAR']
const PYTHON_PATTERNS = [
    /os\.getenv\(\s*['"]([A-Za-z_][A-Za-z0-9_]*)['"]\s*(?:,\s*['"]([^'"]*)['"]\s*)?\)/g,
    /os\.environ\.get\(\s*['"]([A-Za-z_][A-Za-z0-9_]*)['"]\s*(?:,\s*['"]([^'"]*)['"]\s*)?\)/g,
    /os\.environ\[['"]([A-Za-z_][A-Za-z0-9_]*)['"]\]/g,
];

// Go: os.Getenv("VAR")
const GO_PATTERNS = [
    /os\.Getenv\(\s*"([A-Za-z_][A-Za-z0-9_]*)"\s*\)/g,
];

// Java: System.getenv("VAR")
const JAVA_PATTERNS = [
    /System\.getenv\(\s*"([A-Za-z_][A-Za-z0-9_]*)"\s*\)/g,
];

// .NET: Environment.GetEnvironmentVariable("VAR")
const DOTNET_PATTERNS = [
    /Environment\.GetEnvironmentVariable\(\s*"([A-Za-z_][A-Za-z0-9_]*)"\s*\)/g,
];

// PHP: getenv('VAR'), $_ENV['VAR']
const PHP_PATTERNS = [
    /getenv\(\s*['"]([A-Za-z_][A-Za-z0-9_]*)['"]\s*\)/g,
    /\$_ENV\[['"]([A-Za-z_][A-Za-z0-9_]*)['"]\]/g,
];

// Rust: std::env::var("VAR"), env::var("VAR")
const RUST_PATTERNS = [
    /(?:std::)?env::var\(\s*"([A-Za-z_][A-Za-z0-9_]*)"\s*\)/g,
];

const LANGUAGE_MAP = {
    '.js': { language: 'javascript', patterns: NODE_PATTERNS },
    '.mjs': { language: 'javascript', patterns: NODE_PATTERNS },
    '.cjs': { language: 'javascript', patterns: NODE_PATTERNS },
    '.ts': { language: 'typescript', patterns: NODE_PATTERNS },
    '.tsx': { language: 'typescript', patterns: NODE_PATTERNS },
    '.jsx': { language: 'javascript', patterns: NODE_PATTERNS },
    '.py': { language: 'python', patterns: PYTHON_PATTERNS },
    '.go': { language: 'go', patterns: GO_PATTERNS },
    '.java': { language: 'java', patterns: JAVA_PATTERNS },
    '.cs': { language: 'csharp', patterns: DOTNET_PATTERNS },
    '.php': { language: 'php', patterns: PHP_PATTERNS },
    '.rs': { language: 'rust', patterns: RUST_PATTERNS },
};

const SCANNABLE_EXTENSIONS = new Set(Object.keys(LANGUAGE_MAP));
const MAX_FILE_SIZE = 512 * 1024; // 512KB per file

//  File-Based Detection 

// Parse .env.example / .env.template / .env.sample files.
async function parseEnvTemplateFile(rootPath, relPath) {
    const results = [];
    try {
        const content = await readFile(join(rootPath, relPath), 'utf8');
        const lines = content.split('\n');

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line || line.startsWith('#')) continue;

            const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
            if (match) {
                const [, name, rawDefault] = match;
                const defaultValue = rawDefault.replace(/^['"]|['"]$/g, '').trim() || null;

                results.push({
                    name,
                    sourceFile: relPath,
                    lineNumber: i + 1,
                    language: 'env',
                    heuristic: 'env_template_file',
                    defaultValue,
                    confidence: 0.95,
                    source: relPath.includes('example') ? '.env.example'
                        : relPath.includes('template') ? '.env.template'
                        : relPath.includes('sample') ? '.env.sample'
                        : 'env_file',
                });
            }
        }
    } catch {
        // File unreadable — skip
    }
    return results;
}

// Parse Dockerfile ENV and ARG directives.
async function parseDockerfile(rootPath, relPath) {
    const results = [];
    try {
        const content = await readFile(join(rootPath, relPath), 'utf8');
        const lines = content.split('\n');

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            // ENV VAR=value or ENV VAR value
            const envMatch = line.match(/^ENV\s+([A-Za-z_][A-Za-z0-9_]*)(?:=(.*)|\s+(.*))?$/i);
            if (envMatch) {
                const name = envMatch[1];
                const defaultValue = (envMatch[2] || envMatch[3] || '').replace(/^['"]|['"]$/g, '').trim() || null;
                results.push({
                    name,
                    sourceFile: relPath,
                    lineNumber: i + 1,
                    language: 'dockerfile',
                    heuristic: 'dockerfile_env',
                    defaultValue,
                    confidence: 0.90,
                    source: 'dockerfile',
                });
            }

            // ARG VAR=default
            const argMatch = line.match(/^ARG\s+([A-Za-z_][A-Za-z0-9_]*)(?:=(.*))?$/i);
            if (argMatch) {
                results.push({
                    name: argMatch[1],
                    sourceFile: relPath,
                    lineNumber: i + 1,
                    language: 'dockerfile',
                    heuristic: 'dockerfile_arg',
                    defaultValue: argMatch[2]?.replace(/^['"]|['"]$/g, '').trim() || null,
                    confidence: 0.80,
                    source: 'dockerfile',
                });
            }
        }
    } catch {
        // File unreadable — skip
    }
    return results;
}

// Parse docker-compose.yml environment blocks.
async function parseComposeFile(rootPath, relPath) {
    const results = [];
    try {
        const content = await readFile(join(rootPath, relPath), 'utf8');
        // Simple regex-based extraction (avoids yaml dependency for the scanner)
        const envLineRegex = /^\s+-?\s*([A-Za-z_][A-Za-z0-9_]*)(?:=(.*))?$/gm;
        let inEnvironment = false;
        const lines = content.split('\n');

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (/^\s+environment:/i.test(line)) {
                inEnvironment = true;
                continue;
            }
            if (inEnvironment) {
                if (/^\s+\w+:/.test(line) && !/^\s+-/.test(line) && !/^\s+[A-Z_]+=/.test(line)) {
                    inEnvironment = false;
                    continue;
                }
                const match = line.match(/^\s+-?\s*([A-Za-z_][A-Za-z0-9_]*)(?:=(.*))?$/);
                if (match) {
                    results.push({
                        name: match[1],
                        sourceFile: relPath,
                        lineNumber: i + 1,
                        language: 'yaml',
                        heuristic: 'compose_environment',
                        defaultValue: match[2]?.trim() || null,
                        confidence: 0.85,
                        source: 'docker-compose',
                    });
                }
            }
        }
    } catch {
        // File unreadable — skip
    }
    return results;
}

// Scan a single source code file for env var references.
async function scanSourceFile(rootPath, relPath) {
    const ext = extname(relPath).toLowerCase();
    const langConfig = LANGUAGE_MAP[ext];
    if (!langConfig) return [];

    const results = [];
    try {
        const fullPath = join(rootPath, relPath);
        const { size } = await import('fs/promises').then(fs => fs.stat(fullPath));
        if (size > MAX_FILE_SIZE) return [];

        const content = await readFile(fullPath, 'utf8');
        const lines = content.split('\n');

        for (const pattern of langConfig.patterns) {
            // Reset regex lastIndex for each file
            const regex = new RegExp(pattern.source, pattern.flags);
            let match;

            while ((match = regex.exec(content)) !== null) {
                const name = match[1];
                const defaultValue = match[2] || null;

                // Find line number
                const beforeMatch = content.substring(0, match.index);
                const lineNumber = beforeMatch.split('\n').length;

                results.push({
                    name,
                    sourceFile: relPath,
                    lineNumber,
                    language: langConfig.language,
                    heuristic: `${langConfig.language}_env_pattern`,
                    defaultValue,
                    confidence: 0.90,
                    source: 'source_code',
                });
            }
        }
    } catch {
        // File unreadable — skip
    }
    return results;
}

//  Main Scanner 

// Deduplicate detected variables. Keep the highest-confidence detection
// for each unique variable name, and aggregate requiredBy services.
function deduplicateDetections(detections) {
    const byName = new Map();

    for (const detection of detections) {
        const existing = byName.get(detection.name);
        if (!existing || detection.confidence > existing.confidence) {
            byName.set(detection.name, { ...detection, requiredBy: new Set(detection.requiredBy || []) });
        } else {
            // Merge requiredBy
            for (const svc of (detection.requiredBy || [])) {
                existing.requiredBy.add(svc);
            }
            // Keep highest confidence
            if (detection.confidence > existing.confidence) {
                existing.confidence = detection.confidence;
                existing.sourceFile = detection.sourceFile;
                existing.lineNumber = detection.lineNumber;
                existing.heuristic = detection.heuristic;
            }
            // Prefer non-null defaults
            if (!existing.defaultValue && detection.defaultValue) {
                existing.defaultValue = detection.defaultValue;
            }
        }
    }

    return Array.from(byName.values()).map(d => {
        const classification = classifyVariable(d.name, d.defaultValue, d.sourceFile, d.framework);
        
        return {
            ...d,
            requiredBy: Array.from(d.requiredBy),
            type: classification.type,
            // Blend the detection confidence with the classification confidence
            classificationConfidence: classification.confidence,
            explanation: classification.explanation
        };
    });
}

// Scan a repository workspace for environment variable references.


export async function scanEnvironmentVariables(workspacePath, detectedServices = null) {
    const startTime = Date.now();

    // 1. Scan the repo file tree
    const scanData = await scanRepository(workspacePath);
    const services = detectedServices || detectServices(scanData);

    const allDetections = [];

    // 2. Parse env template files
    for (const envFile of scanData.envFiles) {
        const detections = await parseEnvTemplateFile(workspacePath, envFile);
        allDetections.push(...detections);
    }

    // 3. Parse Dockerfiles
    const dockerfiles = scanData.files.filter(f =>
        f.toLowerCase() === 'dockerfile' ||
        f.toLowerCase().endsWith('/dockerfile') ||
        f.match(/dockerfile\.[a-z]+$/i),
    );
    for (const df of dockerfiles) {
        const detections = await parseDockerfile(workspacePath, df);
        allDetections.push(...detections);
    }

    // 4. Parse Compose files
    const composeFiles = scanData.files.filter(f =>
        /docker-compose\.ya?ml$/i.test(f) ||
        /compose\.ya?ml$/i.test(f),
    );
    for (const cf of composeFiles) {
        const detections = await parseComposeFile(workspacePath, cf);
        allDetections.push(...detections);
    }

    // 5. Scan source code per service (for service attribution)
    for (const service of services) {
        const servicePrefix = service.path === '.' ? '' : `${service.path}/`;
        const serviceFiles = scanData.files.filter(f => {
            if (servicePrefix === '') return true;
            return f.startsWith(servicePrefix);
        });

        const scannableFiles = serviceFiles.filter(f =>
            SCANNABLE_EXTENSIONS.has(extname(f).toLowerCase()),
        );

        for (const file of scannableFiles) {
            const detections = await scanSourceFile(workspacePath, file);
            // Attribute each detection to this service
            for (const d of detections) {
                d.requiredBy = [service.name];
                d.framework = null; // Will be enriched by the caller if needed
            }
            allDetections.push(...detections);
        }
    }

    // 6. Deduplicate and classify
    const variables = deduplicateDetections(allDetections);

    const durationMs = Date.now() - startTime;

    logger.info('Environment scanner completed', {
        detectedCount: variables.length,
        secretCount: variables.filter(v => v.type === 'secret').length,
        variableCount: variables.filter(v => v.type === 'variable').length,
        unknownCount: variables.filter(v => v.type === 'unknown').length,
        filesScanned: scanData.files.length,
        durationMs,
    });

    return {
        variables,
        metadata: {
            scannedAt: new Date().toISOString(),
            durationMs,
            filesScanned: scanData.files.length,
            servicesDetected: services.map(s => s.name),
            envTemplateFiles: scanData.envFiles,
        },
    };
}

export default { scanEnvironmentVariables };
