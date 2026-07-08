import platformEventBus from '../events/platformEventBus.js';
import logger from '../utils/logger.js';

export const DOCKERHUB_EVENTS = {
    DOCKERHUB_CONNECT: 'DOCKERHUB_CONNECT',
    DOCKERHUB_DISCONNECT: 'DOCKERHUB_DISCONNECT',
    IMAGE_PULL_STARTED: 'IMAGE_PULL_STARTED',
    IMAGE_PULL_SUCCESS: 'IMAGE_PULL_SUCCESS',
    IMAGE_PULL_FAILED: 'IMAGE_PULL_FAILED',
    IMAGE_PUSH_SUCCESS: 'IMAGE_PUSH_SUCCESS',
    IMAGE_PUSH_FAILED: 'IMAGE_PUSH_FAILED'
};

const SEVERITY_MAP = {
    [DOCKERHUB_EVENTS.DOCKERHUB_CONNECT]: 'INFO',
    [DOCKERHUB_EVENTS.DOCKERHUB_DISCONNECT]: 'INFO',
    [DOCKERHUB_EVENTS.IMAGE_PULL_STARTED]: 'INFO',
    [DOCKERHUB_EVENTS.IMAGE_PULL_SUCCESS]: 'INFO',
    [DOCKERHUB_EVENTS.IMAGE_PULL_FAILED]: 'WARN',
    [DOCKERHUB_EVENTS.IMAGE_PUSH_SUCCESS]: 'INFO',
    [DOCKERHUB_EVENTS.IMAGE_PUSH_FAILED]: 'WARN'
};

/**
 * Fire-and-forget Docker Hub audit logging.
 * Never blocks the request, never throws.
 * IMPORTANT: metadata must NEVER contain credentials or authconfig.
 */
export function logDockerHubEvent({ event, userId, metadata = {} }) {
    const severity = SEVERITY_MAP[event] || 'INFO';
    const isSuccess = event.includes('SUCCESS') || event === DOCKERHUB_EVENTS.DOCKERHUB_CONNECT || event === DOCKERHUB_EVENTS.DOCKERHUB_DISCONNECT || event === DOCKERHUB_EVENTS.IMAGE_PULL_STARTED;

    // Fire and forget — don't await
    platformEventBus.publish('SECURITY', event, {
        severity,
        userId,
        payload: {
            summary: `DockerHub Action: ${event}`,
            metadata: {
                ...metadata
            }
        }
    });

    const logMethod = severity === 'WARN' ? 'warn' : 'info';
    logger[logMethod](`DockerHub event: ${event}`, {
        userId: userId?.toString(),
        ...metadata
    });
}
