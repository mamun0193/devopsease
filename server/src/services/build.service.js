import { writeFileSync, existsSync } from 'fs';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { pack } from 'tar-fs';
import docker from '../docker/client.js';
import crypto from 'crypto';

import Build from '../models/build.model.js';
import Repository from '../models/repository.model.js';
import Image from '../models/image.js';
import User from '../models/User.js';
import logger from '../utils/logger.js';
import { createTempBuildDir, cleanupTempDir } from '../utils/tempDir.js';
import { extractImageMetadata } from './imageMetadata.service.js';
import { generateFingerprints } from './imageFingerprint.service.js';
import { recordImageEvent, transitionImageStatus } from './imageLifecycle.service.js';
import { logBuildEvent, BUILD_EVENTS } from './build.audit.js';
import { broadcastBuildLog, broadcastBuildComplete } from '../websocket/build.socket.js';
import { analyzeBuildFailure } from './buildIntelligence.service.js';
import { orchestrateBuildIntelligence } from './build/buildIntelligence.orchestrator.js';
import resourceService from '../resources/resource.service.js';
import { RESOURCE_TYPES } from '../resources/resourceTypes.js';
import { pullLatest } from './git.service.js';
import { detectProjectType, PROJECT_TYPES } from './projectDetector.service.js';
import { getWorkspacePath, validateSafePath } from '../utils/workspace.js';
import { runDockerCommand } from '../docker/cliExec.js';
import { deployFromBuild } from './deployment.service.js';
import {
    initLogFile, appendLogLine, closeAppendStream,
    readLogFile, getLogSize,
} from './buildLog.service.js';

const MAX_DOCKERFILE_SIZE = 200 * 1024; // 200KB
const MAX_CONCURRENT_BUILDS = 2;
const BUILD_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
const MAX_LOG_SUMMARY_LINES = 200;
const MAX_STORAGE_MB = 5000; // 5GB per user default
const MAX_PIPELINE_LOG_LINES = 3000;

function sanitizeRepoName(repoName = 'repo') {
    return String(repoName)
        .toLowerCase()
        .replace(/[^a-z0-9._-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') || 'repo';
}

function buildImageTag(repoName) {
    const shortId = crypto.randomBytes(3).toString('hex');
    return `${sanitizeRepoName(repoName)}:${shortId}`;
}

function pushBuildLog(logs, line) {
    if (!line) return;

    const lines = line
        .split('\n')
        .map((entry) => entry.trim())
        .filter(Boolean);

    for (const entry of lines) {
        logs.push(entry);
        if (logs.length > MAX_PIPELINE_LOG_LINES) {
            logs.shift();
        }
    }
}

async function ensureGeneratedDockerfile(projectType, workspacePath) {
    const dockerfilePath = join(workspacePath, 'Dockerfile');
    const dockerignorePath = join(workspacePath, '.dockerignore');

    if (!existsSync(dockerignorePath)) {
        const ignoreContent = [
            'node_modules',
            'npm-debug.log',
            '.git',
            '.env',
            'workspace',
            'storage',
            'dist',
            'build'
        ].join('\n');
        await writeFile(dockerignorePath, `${ignoreContent}\n`, 'utf8');
    }

    if (existsSync(dockerfilePath)) return;

    if (projectType === PROJECT_TYPES.NODE) {
        let hasBuildScript = false;
        try {
            const pkgPath = join(workspacePath, 'package.json');
            if (existsSync(pkgPath)) {
                const fsPromises = await import('fs/promises');
                const pkg = JSON.parse(await fsPromises.readFile(pkgPath, 'utf8'));
                if (pkg.scripts && pkg.scripts.build) {
                    hasBuildScript = true;
                }
            }
        } catch (err) {}

        let content = '';

        if (hasBuildScript) {
            content = [
                'FROM node:20-alpine AS builder',
                'WORKDIR /app',
                'COPY package*.json ./',
                'RUN npm install',
                'COPY . .',
                'RUN npm run build',
                'RUN npm prune --production && npm cache clean --force',
                '',
                'FROM node:20-alpine',
                'WORKDIR /app',
                'COPY --from=builder /app ./',
                'EXPOSE 3000',
                'CMD ["npm", "start"]'
            ].join('\n');
        } else {
            content = [
                'FROM node:20-alpine AS builder',
                'WORKDIR /app',
                'COPY package*.json ./',
                'RUN npm install',
                'COPY . .',
                'RUN npm prune --production && npm cache clean --force',
                '',
                'FROM node:20-alpine',
                'WORKDIR /app',
                'COPY --from=builder /app ./',
                'EXPOSE 3000',
                'CMD ["npm", "start"]'
            ].join('\n');
        }

        await writeFile(dockerfilePath, `${content}\n`, 'utf8');
        return;
    }

    if (projectType === PROJECT_TYPES.PYTHON) {
        const content = [
            'FROM python:3.11-slim',
            'WORKDIR /app',
            'COPY requirements.txt .',
            'RUN pip install --no-cache-dir -r requirements.txt',
            'COPY . .',
            'EXPOSE 8000',
            'CMD ["python", "app.py"]'
        ].join('\n');

        await writeFile(dockerfilePath, `${content}\n`, 'utf8');
    }
}

export async function runBuildPipeline(repo, payload = {}) {
    const imageTag = buildImageTag(repo?.repoName);
    const commitHash = payload?.after || null;
    const logLines = [];  // in-memory buffer for logSummary generation

    let build = null;
    let logPath = null;

    try {
        build = await Build.create({
            repoId: repo?._id || null,
            userId: repo?.userId || null,
            tag: imageTag,
            imageTag,
            commitHash,
            dockerfileContent: 'AUTO_GENERATED_PIPELINE',
            status: 'running',
            startedAt: new Date(),
        });

        // Initialize filesystem log
        logPath = await initLogFile(build._id.toString());
        build.storage = logPath;
        await build.save();

        const pushLine = (line) => {
            pushBuildLog(logLines, line);
            if (logPath) appendLogLine(logPath, line);
            if (payload?.onLog) payload.onLog(line);
        };

        pushLine(`[pipeline] starting build for ${repo.repoName}`);

        await pullLatest(repo);
        pushLine(`[git] pulled latest branch ${repo.defaultBranch || 'main'}`);

        const workspacePath = getWorkspacePath(repo.userId, repo._id);
        validateSafePath(workspacePath);

        const detection = await detectProjectType(workspacePath);
        pushLine(`[detector] type=${detection.type} files=${detection.detectedFiles.join(',') || 'none'}`);

        if (detection.type === PROJECT_TYPES.UNKNOWN) {
            throw new Error('Unsupported project type: unknown');
        }

        if (detection.type === PROJECT_TYPES.COMPOSE) {
            await runDockerCommand('docker-compose', ['build'], {
                cwd: workspacePath,
                onStdout: (line) => pushLine(line),
                onStderr: (line) => pushLine(line),
            });
        } else {
            if (detection.type === PROJECT_TYPES.NODE || detection.type === PROJECT_TYPES.PYTHON) {
                await ensureGeneratedDockerfile(detection.type, workspacePath);
                pushLine(`[dockerfile] generated default Dockerfile for ${detection.type} (if missing)`);
            }
            
            // Generate Build Intelligence Manifest
            let dockerfileContent = '';
            try {
                const fsPromises = await import('fs/promises');
                dockerfileContent = await fsPromises.readFile(join(workspacePath, 'Dockerfile'), 'utf8');
            } catch (err) {}
            
            pushLine(`[build-intelligence] Analyzing build context and planning cache strategy...`);
            const manifest = await orchestrateBuildIntelligence(
                repo._id, 
                repo.userId, 
                workspacePath, 
                repo.defaultBranch || 'main', 
                commitHash, 
                dockerfileContent
            );
            
            pushLine(`[build-intelligence] Strategy: ${manifest.strategy}`);
            
            build.manifestId = manifest._id;
            if (dockerfileContent) {
                build.dockerfileContent = dockerfileContent;
            }
            await build.save();

            await runDockerCommand('docker', ['build', '-t', imageTag, '.'], {
                cwd: workspacePath,
                onStdout: (line) => pushLine(line),
                onStderr: (line) => pushLine(line),
            });
        }

        // Close the append stream and update metadata
        closeAppendStream(logPath);
        const fileSizeBytes = await getLogSize(logPath);

        let dockerImageId = null;
        let imageSizeBytes = 0;
        let layerCount = 0;
        let sizeMB = 0;

        try {
            const imageInspect = await docker.getImage(imageTag).inspect();
            imageSizeBytes = imageInspect.Size || 0;
            dockerImageId = imageInspect.Id;

            // Extract rich metadata and fingerprints
            const metadata = await extractImageMetadata(dockerImageId, repo._id);
            const fingerprints = await generateFingerprints(workspacePath);
            
            sizeMB = metadata.sizeMB;
            layerCount = metadata.layerCount;

            // Create Image record
            const image = await Image.create({
                userId: repo.userId,
                repoId: repo._id,
                tag: imageTag,
                dockerImageId,
                buildId: build._id,
                ...metadata,
                ...fingerprints,
                lifecycleStatus: 'READY'
            });

            // Log timeline events
            await recordImageEvent(image._id, repo.userId, 'Image Built', { buildId: build._id.toString() });
            await recordImageEvent(image._id, repo.userId, 'Metadata Extracted');
            await recordImageEvent(image._id, repo.userId, 'Tagged', { tag: imageTag });

            // Update User storage
            await User.findByIdAndUpdate(repo.userId, {
                $inc: { storageUsedMB: sizeMB }
            });

            // Register as Resources
            await resourceService.registerResource({
                resourceId: image._id.toString(),
                type: RESOURCE_TYPES.IMAGE,
                ownerId: repo.userId,
                metadata: { tag: imageTag, sizeMB, dockerImageId },
                quotaImpact: { storageMB: sizeMB }
            });
        } catch (inspectError) {
            logger.error('Failed to register image after pipeline build', {
                buildId: String(build._id),
                error: inspectError.message
            });
        }

        build.status = 'success';
        build.finishedAt = new Date();
        build.completedAt = build.finishedAt;
        build.logSummary = logLines.slice(-MAX_LOG_SUMMARY_LINES).join('\n');
        build.logSize = fileSizeBytes;
        build.lastLogAt = new Date();
        build.error = null;
        if (dockerImageId) {
            build.dockerImageId = dockerImageId;
            build.imageSizeBytes = imageSizeBytes;
            build.layerCount = layerCount;
        }
        await build.save();

        await resourceService.registerResource({
            resourceId: build._id.toString(),
            type: RESOURCE_TYPES.BUILD,
            ownerId: repo.userId,
            metadata: { tag: imageTag, status: 'success' }
        }).catch(() => null);

        await Repository.findByIdAndUpdate(repo._id, { lastBuildId: build._id }).catch(() => null);

        logger.info('Build pipeline completed', {
            repoId: String(repo._id),
            buildId: String(build._id),
            imageTag,
            status: build.status,
        });

        // Only auto-deploy if not called from a pipeline (pipeline handles its own deploy step)
        if (!payload?.skipAutoDeploy) {
            deployFromBuild(build).catch((err) => {
                logger.error('Auto-deploy after build failed', {
                    buildId: String(build._id),
                    error: err.message,
                });
            });
        }

        return build;
    } catch (error) {
        if (logPath) {
            appendLogLine(logPath, `[error] ${error.message}`);
            closeAppendStream(logPath);
        }
        pushBuildLog(logLines, `[error] ${error.message}`);

        if (build) {
            const fileSizeBytes = logPath ? await getLogSize(logPath) : 0;
            build.status = 'failed';
            build.error = error.message;
            build.finishedAt = new Date();
            build.completedAt = build.finishedAt;
            build.logSummary = logLines.slice(-MAX_LOG_SUMMARY_LINES).join('\n');
            build.logSize = fileSizeBytes;
            build.lastLogAt = new Date();
            await build.save().catch((saveError) => {
                logger.error('Failed to persist failed pipeline build', {
                    repoId: String(repo?._id || ''),
                    error: saveError.message,
                });
            });
        }

        logger.error('Build pipeline failed', {
            repoId: String(repo?._id || ''),
            imageTag,
            error: error.message,
        });

        return build;
    }
}

class BuildService {

    async startBuild(userId, tag, dockerfileContent) {
        // 1. Validate Dockerfile size
        const sizeBytes = Buffer.byteLength(dockerfileContent, 'utf8');
        if (sizeBytes > MAX_DOCKERFILE_SIZE) {
            throw Object.assign(new Error(`Dockerfile exceeds max size of ${MAX_DOCKERFILE_SIZE / 1024}KB`), { statusCode: 400 });
        }

        // 2. Check duplicate tag in Image collection
        const existingImage = await Image.findOne({ userId, tag });
        if (existingImage) {
            throw Object.assign(new Error(`Image with tag "${tag}" already exists`), { statusCode: 409 });
        }

        // 3. Check concurrent build limit
        const activeBuildCount = await Build.countDocuments({
            userId,
            status: { $in: ['pending', 'running'] }
        });
        if (activeBuildCount >= MAX_CONCURRENT_BUILDS) {
            throw Object.assign(new Error(`Max ${MAX_CONCURRENT_BUILDS} concurrent builds allowed`), { statusCode: 429 });
        }

        // 4. Check storage quota
        const user = await User.findById(userId);
        if (!user) {
            throw Object.assign(new Error('User not found'), { statusCode: 404 });
        }
        if (user.storageUsedMB >= MAX_STORAGE_MB) {
            throw Object.assign(new Error(`Storage quota exceeded (${MAX_STORAGE_MB}MB limit)`), { statusCode: 429 });
        }

        // 5. Create Build record as pending
        const build = await Build.create({
            userId,
            tag,
            dockerfileContent,
            status: 'pending'
        });

        logBuildEvent({
            event: BUILD_EVENTS.BUILD_STARTED,
            userId,
            buildId: build._id,
            tag
        });

        // 6. Execute build asynchronously (don't await — return 202 immediately)
        this._executeBuild(build, user).catch((error) => {
            logger.error('Unhandled build execution error', {
                buildId: build._id.toString(),
                error: error.message
            });
        });

        return build;
    }

    async _executeBuild(build, user) {
        let tempDir = null;
        let timeoutHandle = null;
        let buildStream = null;
        const logLines = [];   // in-memory buffer for logSummary
        let logPath = null;

        try {
            // Move to running
            build.status = 'running';
            build.startedAt = new Date();

            // Initialize filesystem log
            logPath = await initLogFile(build._id.toString());
            build.storage = logPath;
            await build.save();

            // Helper to push logs to both memory buffer and filesystem
            const pushLine = (line) => {
                logLines.push(line);
                appendLogLine(logPath, line);
            };

            // Create temp dir and write Dockerfile
            tempDir = createTempBuildDir(build._id.toString());
            writeFileSync(join(tempDir, 'Dockerfile'), build.dockerfileContent);

            // Create tar stream from temp dir
            const tarStream = pack(tempDir);

            // Build image via Dockerode
            buildStream = await docker.buildImage(tarStream, {
                t: `${build.tag}`,
                nocache: false,
                rm: true
            });

            // Set build timeout
            const timeoutPromise = new Promise((_, reject) => {
                timeoutHandle = setTimeout(() => {
                    logger.warn('Build timeout reached', { buildId: build._id.toString() });
                    if (buildStream) {
                        buildStream.destroy();
                    }
                    reject(new Error('BUILD_TIMEOUT'));
                }, BUILD_TIMEOUT_MS);
            });

            // Follow Docker build progress
            const buildPromise = new Promise((resolve, reject) => {
                docker.modem.followProgress(
                    buildStream,
                    (err, output) => {
                        if (err) return reject(err);
                        resolve(output);
                    },
                    (event) => {
                        // Build step output (e.g. "Step 1/3 : FROM postgres:16")
                        if (event.stream?.trim()) {
                            const line = event.stream.trim();
                            pushLine(line);
                            broadcastBuildLog(build._id.toString(), line);
                        }
                        // Pull / status events (e.g. "Pulling from library/postgres")
                        // Include layer ID prefix when available for context
                        else if (event.status) {
                            // Suppress noisy per-layer download/extract progress
                            const noisy = /^(Downloading|Extracting|Waiting|Verifying Checksum|Download complete)$/i.test(event.status);
                            if (!noisy) {
                                const line = event.id ? `${event.id}: ${event.status}` : event.status;
                                pushLine(line);
                                broadcastBuildLog(build._id.toString(), line);
                            }
                        }
                        if (event.error) {
                            pushLine(`ERROR: ${event.error}`);
                            broadcastBuildLog(build._id.toString(), `ERROR: ${event.error}`);
                        }
                    }
                );
            });

            // Race: build vs timeout
            await Promise.race([buildPromise, timeoutPromise]);
            clearTimeout(timeoutHandle);
            timeoutHandle = null;

            // Close the append stream
            closeAppendStream(logPath);

            // Build succeeded — inspect image
            const imageInspect = await docker.getImage(build.tag).inspect();
            const imageSizeBytes = imageInspect.Size || 0;
            const dockerImageId = imageInspect.Id;

            const metadata = await extractImageMetadata(dockerImageId, null);
            const fingerprints = await generateFingerprints(tempDir);

            const sizeMB = metadata.sizeMB;
            const layerCount = metadata.layerCount;

            // Create Image record
            const image = await Image.create({
                userId: build.userId,
                tag: build.tag,
                dockerImageId,
                buildId: build._id,
                ...metadata,
                ...fingerprints,
                lifecycleStatus: 'READY'
            });

            await recordImageEvent(image._id, build.userId, 'Image Built', { buildId: build._id.toString() });
            await recordImageEvent(image._id, build.userId, 'Metadata Extracted');
            await recordImageEvent(image._id, build.userId, 'Tagged', { tag: build.tag });

            // Update User storage
            await User.findByIdAndUpdate(build.userId, {
                $inc: { storageUsedMB: sizeMB }
            });

            // Register as Resources
            await resourceService.registerResource({
                resourceId: image._id.toString(),
                type: RESOURCE_TYPES.IMAGE,
                ownerId: build.userId,
                metadata: { tag: build.tag, sizeMB, dockerImageId },
                quotaImpact: { storageMB: sizeMB }
            });

            await resourceService.registerResource({
                resourceId: build._id.toString(),
                type: RESOURCE_TYPES.BUILD,
                ownerId: build.userId,
                metadata: { tag: build.tag, status: 'success' }
            });

            // Update Build record — logSummary stays in Mongo, full logs on disk
            const summaryLines = logLines.slice(-MAX_LOG_SUMMARY_LINES);
            const fileSizeBytes = await getLogSize(logPath);
            build.status = 'success';
            build.dockerImageId = dockerImageId;
            build.imageSizeBytes = imageSizeBytes;
            build.layerCount = layerCount;
            build.logSummary = summaryLines.join('\n');
            build.logSize = fileSizeBytes;
            build.lastLogAt = new Date();
            build.completedAt = new Date();
            await build.save();

            logBuildEvent({
                event: BUILD_EVENTS.BUILD_SUCCESS,
                userId: build.userId,
                buildId: build._id,
                tag: build.tag,
                metadata: { sizeMB, layerCount, dockerImageId }
            });

            broadcastBuildComplete(build._id.toString(), 'success');

        } catch (error) {
            if (timeoutHandle) clearTimeout(timeoutHandle);
            if (logPath) closeAppendStream(logPath);

            const isTimeout = error.message === 'BUILD_TIMEOUT';
            const status = isTimeout ? 'timeout' : 'failed';

            build.status = status;
            build.error = isTimeout ? 'Build exceeded 15 minute timeout' : error.message;
            build.completedAt = new Date();

            const summaryLines = logLines.slice(-MAX_LOG_SUMMARY_LINES);
            build.logSummary = summaryLines.join('\n');
            build.logSize = logPath ? await getLogSize(logPath) : 0;
            build.lastLogAt = new Date();
            build.failureAnalysis = analyzeBuildFailure(summaryLines, status);

            await build.save().catch((saveErr) => {
                logger.error('Failed to save build failure status', { error: saveErr.message });
            });

            // Try to remove partial image on failure
            try {
                await docker.getImage(build.tag).remove({ force: true });
            } catch (_) { /* image may not exist */ }

            logBuildEvent({
                event: BUILD_EVENTS.BUILD_FAILED,
                userId: build.userId,
                buildId: build._id,
                tag: build.tag,
                metadata: { error: error.message, status }
            });

            broadcastBuildComplete(build._id.toString(), status);

        } finally {
            if (tempDir) cleanupTempDir(tempDir);
        }
    }

    async getUserBuilds(userId) {
        return Build.find({ userId })
            .select('-dockerfileContent -logSummary')
            .sort({ createdAt: -1 })
            .limit(50)
            .lean();
    }

    async getBuildById(buildId, userId) {
        const build = await Build.findOne({ _id: buildId, userId }).lean();
        if (!build) return null;

        // If filesystem logs exist, read them; otherwise fall back to legacy logSummary/logs
        if (build.logPath) {
            const fileContent = await readLogFile(build.logPath);
            if (fileContent) {
                build.logs = fileContent.split('\n').filter(Boolean);
            }
        }

        return build;
    }

    async recoverStaleBuilds() {
        const staleBuilds = await Build.find({
            status: { $in: ['pending', 'running'] }
        });

        if (staleBuilds.length === 0) return;

        logger.info(`Recovering ${staleBuilds.length} stale build(s)`);

        for (const build of staleBuilds) {
            try {
                // Check if image actually exists in Docker (reconciliation)
                const imageInfo = await docker.getImage(build.tag).inspect();

                if (imageInfo) {
                    // Image exists — build actually succeeded
                    const sizeMB = Math.round((imageInfo.Size / (1024 * 1024)) * 100) / 100;
                    const layerCount = imageInfo.RootFS?.Layers?.length || 0;

                    // Check if Image record already exists
                    const existingImage = await Image.findOne({ userId: build.userId, tag: build.tag });
                    if (!existingImage) {
                        await Image.create({
                            userId: build.userId,
                            tag: build.tag,
                            dockerImageId: imageInfo.Id,
                            sizeMB,
                            layerCount,
                            buildId: build._id
                        });
                        await User.findByIdAndUpdate(build.userId, {
                            $inc: { storageUsedMB: sizeMB }
                        });
                    }

                    build.status = 'success';
                    build.dockerImageId = imageInfo.Id;
                    build.imageSizeBytes = imageInfo.Size;
                    build.layerCount = layerCount;
                    build.completedAt = new Date();
                    await build.save();

                    logger.info(`Recovered build as success`, { buildId: build._id.toString(), tag: build.tag });
                }
            } catch (_) {
                // Image doesn't exist — mark as FAILED
                build.status = 'failed';
                build.error = 'Server restarted during build';
                build.completedAt = new Date();
                await build.save();

                logger.info(`Recovered build as failed`, { buildId: build._id.toString(), tag: build.tag });
            }
        }
    }
}

export default new BuildService();
