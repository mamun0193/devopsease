import SecurityLog from '../models/SecurityLog.js';
import logger from '../utils/logger.js';

export const NETWORK_EVENTS = {
    NETWORK_CREATED: 'NETWORK_CREATED',
    NETWORK_DELETED: 'NETWORK_DELETED',
    NETWORK_DELETE_BLOCKED: 'NETWORK_DELETE_BLOCKED',
    NETWORK_RECONCILED: 'NETWORK_RECONCILED',
    NETWORK_DOCKER_GONE: 'NETWORK_DOCKER_GONE',
};

const SEVERITY_MAP = {
    [NETWORK_EVENTS.NETWORK_CREATED]: 'INFO',
    [NETWORK_EVENTS.NETWORK_DELETED]: 'INFO',
    [NETWORK_EVENTS.NETWORK_DELETE_BLOCKED]: 'WARN',
    [NETWORK_EVENTS.NETWORK_RECONCILED]: 'INFO',
    [NETWORK_EVENTS.NETWORK_DOCKER_GONE]: 'WARN',
};

/**
 * Fire-and-forget audit log for network governance events.
 * @param {{ event: string, userId: string|ObjectId, metadata?: object }} options
 */
export function logNetworkEvent({ event, userId, metadata = {} }) {
    const severity = SEVERITY_MAP[event] || 'INFO';

    SecurityLog.create({
        userId,
        action: event,
        result: severity === 'WARN' ? 'denied' : 'allowed',
        severity,
        metadata
    }).catch((err) => {
        logger.warn('Network audit log write failed', { event, error: err.message });
    });

    const logMethod = severity === 'WARN' ? 'warn' : 'info';
    logger[logMethod](`Network event: ${event}`, {
        userId: userId?.toString(),
        ...metadata
    });
}
