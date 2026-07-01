import crypto from 'crypto';

export function computeDockerfileFingerprint(dockerfileContent) {
    if (!dockerfileContent) return null;
    // Normalize newlines and whitespace before hashing
    const normalized = dockerfileContent
        .replace(/\r\n/g, '\n')
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0 && !line.startsWith('#'))
        .join('\n');
    
    return crypto.createHash('sha256').update(normalized).digest('hex');
}

export function analyzeDockerfileLayers(dockerfileContent) {
    if (!dockerfileContent) return [];

    const lines = dockerfileContent.split('\n');
    const layers = [];
    
    // Combine multi-line instructions
    const instructions = [];
    let currentInstruction = '';

    for (let line of lines) {
        line = line.trim();
        if (!line || line.startsWith('#')) continue;

        if (line.endsWith('\\')) {
            currentInstruction += line.slice(0, -1) + ' ';
        } else {
            currentInstruction += line;
            instructions.push(currentInstruction);
            currentInstruction = '';
        }
    }

    for (const instruction of instructions) {
        let layerType = 'UNKNOWN';
        const upperInst = instruction.toUpperCase();

        if (upperInst.startsWith('FROM ') || upperInst.startsWith('MAINTAINER ') || upperInst.startsWith('LABEL ') || upperInst.startsWith('ENV ') || upperInst.startsWith('ARG ') || upperInst.startsWith('WORKDIR ') || upperInst.startsWith('USER ')) {
            layerType = 'SYSTEM';
        } else if (upperInst.startsWith('CMD ') || upperInst.startsWith('ENTRYPOINT ') || upperInst.startsWith('EXPOSE ') || upperInst.startsWith('HEALTHCHECK ')) {
            layerType = 'RUNTIME';
        } else if (upperInst.startsWith('COPY ') || upperInst.startsWith('ADD ')) {
            // Distinguish source vs dependency
            if (upperInst.includes('PACKAGE.JSON') || upperInst.includes('PACKAGE*.JSON') || upperInst.includes('REQUIREMENTS.TXT') || upperInst.includes('GO.MOD') || upperInst.includes('POM.XML') || upperInst.includes('YARN.LOCK') || upperInst.includes('POETRY.LOCK')) {
                layerType = 'DEPENDENCY';
            } else {
                layerType = 'SOURCE';
            }
        } else if (upperInst.startsWith('RUN ')) {
            if (upperInst.includes('NPM INSTALL') || upperInst.includes('PIP INSTALL') || upperInst.includes('GO MOD') || upperInst.includes('APT-GET') || upperInst.includes('APK ADD') || upperInst.includes('YARN INSTALL') || upperInst.includes('MVN') || upperInst.includes('NPM CI')) {
                layerType = 'DEPENDENCY';
            } else if (upperInst.includes('BUILD') || upperInst.includes('MAKE') || upperInst.includes('NPM RUN')) {
                layerType = 'SOURCE'; // Build step usually operates on source
            } else {
                layerType = 'SYSTEM';
            }
        }

        const instructionHash = crypto.createHash('sha256').update(instruction).digest('hex');
        const layerId = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
        
        let cacheability = 'CACHEABLE';
        if (upperInst.includes('APT-GET UPDATE') || upperInst.includes('APK UPDATE') || upperInst.startsWith('ARG ')) {
            cacheability = 'VOLATILE';
        }

        layers.push({
            layerId,
            instructionHash,
            instruction: instruction.length > 150 ? instruction.substring(0, 147) + '...' : instruction,
            layerType,
            cacheStatus: 'UNKNOWN',
            cacheability
        });
    }

    return layers;
}
