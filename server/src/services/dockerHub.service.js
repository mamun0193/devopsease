import { saveDockerHubCredentials, getDockerHubCredentials, deleteDockerHubCredentials } from './dockerHubAuth.service.js';
import Image from '../models/image.js';
import docker from '../docker/client.js';
import { enforcePullLimit, enforcePushLimit, releasePullSlot, clearUserLimits } from './registryRateLimiter.service.js';
import { logDockerHubEvent, DOCKERHUB_EVENTS } from './dockerHub.audit.js';
import imageRegistrationService from './imageRegistration.service.js';
import logger from '../utils/logger.js';
import AppError from '../utils/AppError.js';

// Valid repository tag pattern: [namespace/]repo[:tag]
const REPO_TAG_REGEX = /^[a-z0-9]+(?:[._-][a-z0-9]+)*(?:\/[a-z0-9]+(?:[._-][a-z0-9]+)*)*(?::[a-zA-Z0-9._-]+)?$/;
const MAX_REPO_TAG_LENGTH = 128;

class DockerHubService {
    /**
     * Connect Docker Hub — validate credentials, encrypt password & upsert credential.
     * Never returns password.
     */
    async connectDockerHub(userId, username, password) {
        if (!username || !password) {
            throw new AppError('Username and password are required', 400, 'MISSING_CREDENTIALS');
        }

        // Validate credentials against Docker Hub before storing
        try {
            await docker.checkAuth({
                username,
                password,
                serveraddress: 'https://index.docker.io/v1/'
            });
        } catch (authError) {
            logger.warn('Docker Hub credential validation failed', {
                userId: userId.toString(),
                username,
                error: authError.message
            });
            throw new AppError(
                'Invalid Docker Hub credentials. Please check your username and password.',
                401,
                'AUTH_FAILED'
            );
        }

        await saveDockerHubCredentials(userId, username, password);

        logDockerHubEvent({
            event: DOCKERHUB_EVENTS.DOCKERHUB_CONNECT,
            userId,
            metadata: { username }
        });

        return { connected: true, username };
    }

    /**
     * Disconnect Docker Hub — delete credential + clear rate limiter.
     */
    async disconnectDockerHub(userId) {
        await deleteDockerHubCredentials(userId);

        // Clear rate limiter entry to prevent stale blocking after reconnect
        clearUserLimits(userId);

        logDockerHubEvent({
            event: DOCKERHUB_EVENTS.DOCKERHUB_DISCONNECT,
            userId,
            metadata: { deleted: true }
        });

        return { disconnected: true };
    }

    /**
     * Get Docker Hub connection status.
     * Never returns password.
     */
    async getDockerHubStatus(userId) {
        const credential = await getDockerHubCredentials(userId);

        if (!credential) {
            return { connected: false, username: null };
        }

        return { connected: true, username: credential.username };
    }

    /**
     * Pull image from Docker Hub.
     * Enforces rate limit, decrypts credentials, pulls, registers image, audits.
     */
    async pullImage(userId, imageName) {
        if (!imageName || typeof imageName !== 'string') {
            throw new AppError('Image name is required', 400, 'INVALID_IMAGE_NAME');
        }

        // 1. Enforce rate limit (throws 429 if exceeded)
        enforcePullLimit(userId);

        try {
            // 2. Fetch encrypted credentials
            const credential = await getDockerHubCredentials(userId);

            if (!credential) {
                throw new AppError('Docker Hub not connected. Please connect first.', 401, 'NOT_CONNECTED');
            }

            const password = credential.token;

            const authconfig = {
                username: credential.username,
                password,
                serveraddress: 'https://index.docker.io/v1/'
            };

            // 4. Audit pull started
            logDockerHubEvent({
                event: DOCKERHUB_EVENTS.IMAGE_PULL_STARTED,
                userId,
                metadata: { imageName }
            });

            // 5. Pull image via Dockerode
            await new Promise((resolve, reject) => {
                docker.pull(imageName, { authconfig }, (err, stream) => {
                    if (err) return reject(err);

                    // Stream progress internally (no WebSocket)
                    docker.modem.followProgress(stream, (err, output) => {
                        if (err) return reject(err);
                        resolve(output);
                    });
                });
            });

            // 6. Inspect image to get metadata
            const inspectData = await docker.getImage(imageName).inspect();
            const sizeBytes = inspectData.Size || inspectData.VirtualSize || 0;
            const sizeMB = Math.round((sizeBytes / (1024 * 1024)) * 100) / 100;

            // TODO: Enforce storage quota before registering pulled image
            // If image does NOT already exist in DB and sizeMB + user.storageUsedMB > quota → Reject with 403

            // 7. Register image (handles idempotency — no double-count storage)
            const imageRecord = await imageRegistrationService.ensureImageRegistered({
                userId,
                imageName
            });

            // 8. Audit success
            logDockerHubEvent({
                event: DOCKERHUB_EVENTS.IMAGE_PULL_SUCCESS,
                userId,
                metadata: {
                    imageName,
                    sizeMB,
                    dockerImageId: inspectData.Id?.substring(0, 16),
                    imageRecordId: imageRecord._id?.toString()
                }
            });

            return {
                imageId: imageRecord._id,
                tag: imageRecord.tag,
                sizeMB: imageRecord.sizeMB,
                layerCount: imageRecord.layerCount,
                dockerImageId: imageRecord.dockerImageId,
                pulledFrom: imageRecord.pulledFrom,
                pullCount: imageRecord.pullCount
            };
        } catch (error) {
            // Audit failure — sanitize error (only error.message, no raw Docker object/authconfig)
            logDockerHubEvent({
                event: DOCKERHUB_EVENTS.IMAGE_PULL_FAILED,
                userId,
                metadata: {
                    imageName,
                    error: error.message || 'Unknown error'
                }
            });

            // Re-throw known AppErrors, wrap unknown errors
            if (error.isOperational) throw error;

            // Handle specific Docker errors
            if (error.statusCode === 401 || error.message?.includes('unauthorized')) {
                throw new AppError('Docker Hub authentication failed. Check your credentials.', 401, 'AUTH_FAILED');
            }
            if (error.statusCode === 404 || error.message?.includes('not found')) {
                throw new AppError(`Image "${imageName}" not found on Docker Hub.`, 404, 'IMAGE_NOT_FOUND');
            }

            throw new AppError(`Failed to pull image: ${error.message}`, 500, 'PULL_FAILED');
        } finally {
            // Always release concurrent pull slot
            releasePullSlot(userId);
        }
    }

    /**
     * Push image to Docker Hub.
     * Enforces rate limit, verifies ownership, tags, pushes, audits.
     */
    async pushImage(userId, imageId, repositoryTag) {
        // 1. Validate repositoryTag
        if (!repositoryTag || typeof repositoryTag !== 'string') {
            throw new AppError('Repository tag is required', 400, 'MISSING_REPO_TAG');
        }

        const trimmedTag = repositoryTag.trim();
        if (trimmedTag.length === 0 || trimmedTag.length > MAX_REPO_TAG_LENGTH) {
            throw new AppError(`Repository tag must be between 1 and ${MAX_REPO_TAG_LENGTH} characters`, 400, 'INVALID_REPO_TAG');
        }
        if (/\s/.test(trimmedTag)) {
            throw new AppError('Repository tag must not contain spaces', 400, 'INVALID_REPO_TAG');
        }
        if (!REPO_TAG_REGEX.test(trimmedTag)) {
            throw new AppError('Invalid repository tag format. Expected format: [namespace/]repo[:tag]', 400, 'INVALID_REPO_TAG');
        }

        // 2. Enforce push rate limit (throws 429 if exceeded)
        enforcePushLimit(userId);

        // 3. Verify image belongs to user (multi-tenant isolation)
        const image = await Image.findOne({ _id: imageId, userId });
        if (!image) {
            throw new AppError('Image not found or does not belong to you', 404, 'IMAGE_NOT_FOUND');
        }

        // 4. Fetch credentials
        const credential = await getDockerHubCredentials(userId);

        if (!credential) {
            throw new AppError('Docker Hub not connected. Please connect first.', 401, 'NOT_CONNECTED');
        }

        const password = credential.token;
        const authconfig = {
            username: credential.username,
            password,
            serveraddress: 'https://index.docker.io/v1/'
        };

        try {
            // 5. Tag image for push (username/repo:tag)
            const fullTag = trimmedTag.includes('/') ? trimmedTag : `${credential.username}/${trimmedTag}`;
            const [repo, tag = 'latest'] = fullTag.split(':');

            const dockerImage = docker.getImage(image.dockerImageId);
            await dockerImage.tag({ repo, tag });

            // 6. Push image
            const taggedImage = docker.getImage(`${repo}:${tag}`);
            let digest = null;
            await new Promise((resolve, reject) => {
                taggedImage.push({ authconfig }, (err, stream) => {
                    if (err) return reject(err);

                    docker.modem.followProgress(stream, (err, output) => {
                        if (err) return reject(err);

                        // Check for error in final output messages
                        const errorMsg = output?.find(o => o.error);
                        if (errorMsg) return reject(new Error(errorMsg.error));
                        
                        // Extract digest if available
                        for (const event of output) {
                            if (event.aux && event.aux.Digest) {
                                digest = event.aux.Digest;
                            }
                        }

                        resolve(output);
                    });
                });
            });

            // Transition state and record metadata
            const { markAsPushed } = await import('./imageLifecycle.service.js');
            await markAsPushed(imageId, repo, tag, digest);

            // 7. Audit success
            logDockerHubEvent({
                event: DOCKERHUB_EVENTS.IMAGE_PUSH_SUCCESS,
                userId,
                metadata: {
                    imageId: image._id.toString(),
                    originalTag: image.tag,
                    pushedAs: `${repo}:${tag}`
                }
            });

            return {
                success: true,
                pushedAs: `${repo}:${tag}`,
                imageId: image._id
            };
        } catch (error) {
            // Audit failure — sanitize error (only message, no authconfig)
            logDockerHubEvent({
                event: DOCKERHUB_EVENTS.IMAGE_PUSH_FAILED,
                userId,
                metadata: {
                    imageId: image._id.toString(),
                    repositoryTag: trimmedTag,
                    error: error.message || 'Unknown error'
                }
            });

            if (error.isOperational) throw error;

            if (error.statusCode === 401 || error.message?.includes('unauthorized')) {
                throw new AppError('Docker Hub authentication failed. Check your credentials.', 401, 'AUTH_FAILED');
            }

            throw new AppError(`Failed to push image: ${error.message}`, 500, 'PUSH_FAILED');
        }
    }

    /**
     * Search Docker Hub images — uses public Docker Hub API (no credentials needed).
     */
    async searchImages(query, page = 1, pageSize = 25) {
        const trimmed = (query || '').trim();
        if (!trimmed || trimmed.length < 2) {
            throw new AppError('Search query must be at least 2 characters', 400, 'INVALID_QUERY');
        }

        if (pageSize > 100) pageSize = 100;
        if (page < 1) page = 1;

        const url = `https://hub.docker.com/v2/search/repositories/?query=${encodeURIComponent(trimmed)}&page=${page}&page_size=${pageSize}`;

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);

        try {
            const response = await fetch(url, {
                signal: controller.signal,
                headers: { 'Accept': 'application/json' }
            });

            if (!response.ok) {
                throw new AppError('Docker Hub search unavailable', response.status, 'SEARCH_FAILED');
            }

            const data = await response.json();

            return {
                results: (data.results || []).map(r => ({
                    name: r.repo_name || r.name,
                    description: (r.short_description || '').substring(0, 200),
                    starCount: r.star_count || 0,
                    isOfficial: r.is_official || false,
                    pullCount: r.pull_count || 0,
                })),
                totalCount: data.count || 0,
                page,
                pageSize
            };
        } catch (err) {
            if (err.isOperational) throw err;
            if (err.name === 'AbortError') {
                throw new AppError('Docker Hub search timed out', 504, 'SEARCH_TIMEOUT');
            }
            throw new AppError('Failed to search Docker Hub', 500, 'SEARCH_FAILED');
        } finally {
            clearTimeout(timeout);
        }
    }
}

export default new DockerHubService();
