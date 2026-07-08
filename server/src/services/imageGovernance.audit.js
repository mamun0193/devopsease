import platformEventBus from '../events/platformEventBus.js';
import logger from '../utils/logger.js';

export const GOVERNANCE_EVENTS = {
    IMAGE_PRUNE_PREVIEW: 'IMAGE_PRUNE_PREVIEW',
    IMAGE_PRUNE_EXECUTED: 'IMAGE_PRUNE_EXECUTED',
    IMAGE_PRUNE_FAILED: 'IMAGE_PRUNE_FAILED',
    BUILD_CACHE_PRUNE_EXECUTED: 'BUILD_CACHE_PRUNE_EXECUTED'
};

const SEVERITY_MAP = {
    [GOVERNANCE_EVENTS.IMAGE_PRUNE_PREVIEW]: 'info',
    [GOVERNANCE_EVENTS.IMAGE_PRUNE_EXECUTED]: 'info',
    [GOVERNANCE_EVENTS.IMAGE_PRUNE_FAILED]: 'warning',
    [GOVERNANCE_EVENTS.BUILD_CACHE_PRUNE_EXECUTED]: 'info'
};

export function logGovernanceEvent({ event, userId, metadata = {} }) {
    const severity = SEVERITY_MAP[event] || 'info';

    platformEventBus.publish('INFRASTRUCTURE', event, {
        severity: severity.toUpperCase(),
        userId,
        payload: {
            summary: `Governance Action: ${event}`,
            metadata
        }
    });

    const logMethod = severity === 'warning' ? 'warn' : 'info';
    logger[logMethod](`Governance event: ${event}`, {
        userId: userId?.toString(),
        ...metadata
    });
}
