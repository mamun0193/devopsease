import SecurityLog from '../models/SecurityLog.js';
import logger from '../utils/logger.js';

export const TUNNEL_EVENTS = {
    TUNNEL_CREATED: 'TUNNEL_CREATED',
    TUNNEL_REVOKED: 'TUNNEL_REVOKED',
    TUNNEL_EXPIRED: 'TUNNEL_EXPIRED',
};

const SEVERITY_MAP = {
    [TUNNEL_EVENTS.TUNNEL_CREATED]: 'INFO',
    [TUNNEL_EVENTS.TUNNEL_REVOKED]: 'INFO',
    [TUNNEL_EVENTS.TUNNEL_EXPIRED]: 'INFO',
};

export function logTunnelEvent({ event, userId, metadata = {} }) {
    const severity = SEVERITY_MAP[event] || 'INFO';

    SecurityLog.create({
        userId,
        action: event,
        result: 'allowed',
        severity,
        metadata
    }).catch((err) => {
        logger.warn('Tunnel audit log write failed', { event, error: err.message });
    });

    logger.info(`Tunnel event: ${event}`, {
        userId: userId?.toString(),
        ...metadata
    });
}
