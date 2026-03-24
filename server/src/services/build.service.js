import { writeFileSync, existsSync } from 'fs';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { pack } from 'tar-fs';
import docker from '../docker/client.js';
import Build from '../models/build.model.js';
import Repository from '../models/repository.model.js';
import Image from '../models/image.js';
import User from '../models/User.js';
import logger from '../utils/logger.js';
import { createTempBuildDir, cleanupTempDir } from '../utils/tempDir.js';
import { logBuildEvent, BUILD_EVENTS } from './build.audit.js';
import { broadcastBuildLog, broadcastBuildComplete } from '../websocket/build.socket.js';
import { analyzeBuildFailure } from './buildIntelligence.service.js';
import resourceService from '../resources/resource.service.js';
import { RESOURCE_TYPES } from '../resources/resourceTypes.js';
import { pullLatest } from './git.service.js';
import { detectProjectType, PROJECT_TYPES } from './projectDetector.service.js';
import { getWorkspacePath, validateSafePath } from '../utils/workspace.js';
import { runDockerCommand } from '../docker/cliExec.js';
import { deployFromBuild } from './deployment.service.js';

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
    return `${sanitizeRepoName(repoName)}:${Date.now()}`;
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
    if (existsSync(dockerfilePath)) return;

    if (projectType === PROJECT_TYPES.NODE) {
        const content = [
            'FROM node:20-alpine',
            'WORKDIR /app',
            'COPY package*.json ./',
            'RUN npm ci --omit=dev || npm install --omit=dev',
            'COPY . .',
            'EXPOSE 3000',
            'CMD ["npm", "start"]'
        ].join('\n');

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
    const logs = [];

    let build = null;

    try {
        build = await Build.create({
            repoId: repo?._id || null,
            userId: repo?.userId || null,
            tag: imageTag,
            imageTag,
            commitHash,
            dockerfileContent: 'AUTO_GENERATED_PIPELINE',
            status: 'running',
            logs,
            startedAt: new Date(),
        });

        pushBuildLog(logs, `[pipeline] starting build for ${repo.repoName}`);

        await pullLatest(repo);
        pushBuildLog(logs, `[git] pulled latest branch ${repo.defaultBranch || 'main'}`);

        const workspacePath = getWorkspacePath(repo.userId, repo._id);
        validateSafePath(workspacePath);

        const detection = await detectProjectType(workspacePath);
        pushBuildLog(logs, `[detector] type=${detection.type} files=${detection.detectedFiles.join(',') || 'none'}`);

        if (detection.type === PROJECT_TYPES.UNKNOWN) {
            throw new Error('Unsupported project type: unknown');
        }

        if (detection.type === PROJECT_TYPES.COMPOSE) {
            await runDockerCommand('docker-compose', ['build'], {
                cwd: workspacePath,
                onStdout: (line) => pushBuildLog(logs, line),
                onStderr: (line) => pushBuildLog(logs, line),
            });
        } else {
            if (detection.type === PROJECT_TYPES.NODE || detection.type === PROJECT_TYPES.PYTHON) {
                await ensureGeneratedDockerfile(detection.type, workspacePath);
                pushBuildLog(logs, `[dockerfile] generated default Dockerfile for ${detection.type} (if missing)`);
            }

            await runDockerCommand('docker', ['build', '-t', imageTag, '.'], {
                cwd: workspacePath,
                onStdout: (line) => pushBuildLog(logs, line),
                onStderr: (line) => pushBuildLog(logs, line),
            });
        }

        build.status = 'success';
        build.logs = logs;
        build.finishedAt = new Date();
        build.completedAt = build.finishedAt;
        build.logSummary = logs.slice(-MAX_LOG_SUMMARY_LINES).join('\n');
        build.error = null;
        await build.save();

        await Repository.findByIdAndUpdate(repo._id, { lastBuildId: build._id }).catch(() => null);

        logger.info('Build pipeline completed', {
            repoId: String(repo._id),
            buildId: String(build._id),
            imageTag,
            status: build.status,
        });

        deployFromBuild(build).catch((err) => {
            logger.error('Auto-deploy after build failed', {
                buildId: String(build._id),
                error: err.message,
            });
        });

        return build;
    } catch (error) {
        pushBuildLog(logs, `[error] ${error.message}`);

        if (build) {
            build.status = 'failed';
            build.logs = logs;
            build.error = error.message;
            build.finishedAt = new Date();
            build.completedAt = build.finishedAt;
            build.logSummary = logs.slice(-MAX_LOG_SUMMARY_LINES).join('\n');
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
            status: { $in: ['PENDING', 'RUNNING'] }
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

        // 5. Create Build record as PENDING
        const build = await Build.create({
            userId,
            tag,
            dockerfileContent,
            status: 'PENDING'
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
        const logLines = [];

        try {
            // Move to RUNNING
            build.status = 'RUNNING';
            build.startedAt = new Date();
            await build.save();

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
                            logLines.push(line);
                            broadcastBuildLog(build._id.toString(), line);
                        }
                        // Pull / status events (e.g. "Pulling from library/postgres")
                        // Include layer ID prefix when available for context
                        else if (event.status) {
                            // Suppress noisy per-layer download/extract progress
                            const noisy = /^(Downloading|Extracting|Waiting|Verifying Checksum|Download complete)$/i.test(event.status);
                            if (!noisy) {
                                const line = event.id ? `${event.id}: ${event.status}` : event.status;
                                logLines.push(line);
                                broadcastBuildLog(build._id.toString(), line);
                            }
                        }
                        if (event.error) {
                            logLines.push(`ERROR: ${event.error}`);
                            broadcastBuildLog(build._id.toString(), `ERROR: ${event.error}`);
                        }
                    }
                );
            });

            // Race: build vs timeout
            await Promise.race([buildPromise, timeoutPromise]);
            clearTimeout(timeoutHandle);
            timeoutHandle = null;

            // Build succeeded — inspect image
            const imageInspect = await docker.getImage(build.tag).inspect();
            const imageSizeBytes = imageInspect.Size || 0;
            const layerCount = imageInspect.RootFS?.Layers?.length || 0;
            const dockerImageId = imageInspect.Id;
            const sizeMB = Math.round((imageSizeBytes / (1024 * 1024)) * 100) / 100;

            // Create Image record
            const image = await Image.create({
                userId: build.userId,
                tag: build.tag,
                dockerImageId,
                sizeMB,
                layerCount,
                buildId: build._id
            });

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
                metadata: { tag: build.tag, status: 'SUCCESS' }
            });

            // Update Build record
            const summaryLines = logLines.slice(-MAX_LOG_SUMMARY_LINES);
            build.status = 'SUCCESS';
            build.dockerImageId = dockerImageId;
            build.imageSizeBytes = imageSizeBytes;
            build.layerCount = layerCount;
            build.logSummary = summaryLines.join('\n');
            build.completedAt = new Date();
            await build.save();

            logBuildEvent({
                event: BUILD_EVENTS.BUILD_SUCCESS,
                userId: build.userId,
                buildId: build._id,
                tag: build.tag,
                metadata: { sizeMB, layerCount, dockerImageId }
            });

            broadcastBuildComplete(build._id.toString(), 'SUCCESS');

        } catch (error) {
            if (timeoutHandle) clearTimeout(timeoutHandle);

            const isTimeout = error.message === 'BUILD_TIMEOUT';
            const status = isTimeout ? 'TIMEOUT' : 'FAILED';

            build.status = status;
            build.error = isTimeout ? 'Build exceeded 15 minute timeout' : error.message;
            build.completedAt = new Date();

            const summaryLines = logLines.slice(-MAX_LOG_SUMMARY_LINES);
            build.logSummary = summaryLines.join('\n');
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
        return Build.findOne({ _id: buildId, userId }).lean();
    }

    async recoverStaleBuilds() {
        const staleBuilds = await Build.find({
            status: { $in: ['PENDING', 'RUNNING'] }
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

                    build.status = 'SUCCESS';
                    build.dockerImageId = imageInfo.Id;
                    build.imageSizeBytes = imageInfo.Size;
                    build.layerCount = layerCount;
                    build.completedAt = new Date();
                    await build.save();

                    logger.info(`Recovered build as SUCCESS`, { buildId: build._id.toString(), tag: build.tag });
                }
            } catch (_) {
                // Image doesn't exist — mark as FAILED
                build.status = 'FAILED';
                build.error = 'Server restarted during build';
                build.completedAt = new Date();
                await build.save();

                logger.info(`Recovered build as FAILED`, { buildId: build._id.toString(), tag: build.tag });
            }
        }
    }
}

export default new BuildService();
