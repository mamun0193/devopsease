import platformEventBus, { DOMAINS, SEVERITIES } from '../events/platformEventBus.js';
import logger from '../utils/logger.js';

export const NETWORK_EVENTS = {
    NETWORK_CREATED: 'NETWORK_CREATED',
    NETWORK_DELETED: 'NETWORK_DELETED',
    NETWORK_DELETE_BLOCKED: 'NETWORK_DELETE_BLOCKED',
    NETWORK_RECONCILED: 'NETWORK_RECONCILED',
    NETWORK_DOCKER_GONE: 'NETWORK_DOCKER_GONE',
};

const SEVERITY_MAP = {
    [NETWORK_EVENTS.NETWORK_CREATED]: SEVERITIES.INFO,
    [NETWORK_EVENTS.NETWORK_DELETED]: SEVERITIES.INFO,
    [NETWORK_EVENTS.NETWORK_DELETE_BLOCKED]: SEVERITIES.WARNING,
    [NETWORK_EVENTS.NETWORK_RECONCILED]: SEVERITIES.INFO,
    [NETWORK_EVENTS.NETWORK_DOCKER_GONE]: SEVERITIES.WARNING,
};

/**
 * Fire-and-forget audit log for network governance events.
 * @param {{ event: string, userId: string|ObjectId, metadata?: object }} options
 */
export function logNetworkEvent({ event, userId, metadata = {} }) {
    const severity = SEVERITY_MAP[event] || SEVERITIES.INFO;

    platformEventBus.publish(DOMAINS.INFRASTRUCTURE, event, {
        severity,
        userId,
        resourceType: 'Network',
        resourceId: metadata.networkId || null,
        payload: {
            ...metadata
        }
    });

    const logMethod = severity === SEVERITIES.WARNING ? 'warn' : 'info';
    logger[logMethod](`Network event: ${event}`, {
        userId: userId?.toString(),
        ...metadata
    });
}
