import SecurityLog from '../models/SecurityLog.js';
import logger from '../utils/logger.js';

export const GOVERNANCE_EVENTS = {
    IMAGE_PRUNE_PREVIEW: 'IMAGE_PRUNE_PREVIEW',
    IMAGE_PRUNE_EXECUTED: 'IMAGE_PRUNE_EXECUTED',
    IMAGE_PRUNE_FAILED: 'IMAGE_PRUNE_FAILED',
    BUILD_CACHE_PRUNE_EXECUTED: 'BUILD_CACHE_PRUNE_EXECUTED'
};

const SEVERITY_MAP = {
    [GOVERNANCE_EVENTS.IMAGE_PRUNE_PREVIEW]: 'INFO',
    [GOVERNANCE_EVENTS.IMAGE_PRUNE_EXECUTED]: 'INFO',
    [GOVERNANCE_EVENTS.IMAGE_PRUNE_FAILED]: 'WARN',
    [GOVERNANCE_EVENTS.BUILD_CACHE_PRUNE_EXECUTED]: 'INFO'
};

export function logGovernanceEvent({ event, userId, metadata = {} }) {
    const severity = SEVERITY_MAP[event] || 'INFO';

    SecurityLog.create({
        userId,
        action: event,
        result: event === GOVERNANCE_EVENTS.IMAGE_PRUNE_FAILED ? 'denied' : 'allowed',
        severity,
        metadata
    }).catch((error) => {
        logger.warn('Governance audit log write failed', { event, error: error.message });
    });

    const logMethod = severity === 'WARN' ? 'warn' : 'info';
    logger[logMethod](`Governance event: ${event}`, {
        userId: userId?.toString(),
        ...metadata
    });
}
