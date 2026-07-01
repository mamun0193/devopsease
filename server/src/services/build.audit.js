import SecurityLog from '../models/SecurityLog.js';
import logger from '../utils/logger.js';

export const BUILD_EVENTS = {
    BUILD_STARTED: 'BUILD_STARTED',
    BUILD_SUCCESS: 'BUILD_SUCCESS',
    BUILD_FAILED: 'BUILD_FAILED',
    BUILD_MANIFEST_GENERATED: 'BUILD_MANIFEST_GENERATED',
    CACHE_PLAN_READY: 'CACHE_PLAN_READY',
    BUILD_CACHE_HIT: 'BUILD_CACHE_HIT',
    BUILD_CACHE_MISS: 'BUILD_CACHE_MISS'
};

const SEVERITY_MAP = {
    [BUILD_EVENTS.BUILD_STARTED]: 'INFO',
    [BUILD_EVENTS.BUILD_SUCCESS]: 'INFO',
    [BUILD_EVENTS.BUILD_FAILED]: 'WARN',
    [BUILD_EVENTS.BUILD_MANIFEST_GENERATED]: 'INFO',
    [BUILD_EVENTS.CACHE_PLAN_READY]: 'INFO',
    [BUILD_EVENTS.BUILD_CACHE_HIT]: 'INFO',
    [BUILD_EVENTS.BUILD_CACHE_MISS]: 'INFO'
};

export function logBuildEvent({ event, userId, buildId, tag, metadata = {} }) {
    const severity = SEVERITY_MAP[event] || 'INFO';

    SecurityLog.create({
        userId,
        action: event,
        result: event === BUILD_EVENTS.BUILD_FAILED ? 'denied' : 'allowed',
        severity,
        metadata: { buildId: buildId?.toString(), tag, ...metadata }
    }).catch((error) => {
        logger.warn('Build audit log write failed', { event, error: error.message });
    });

    const logMethod = severity === 'WARN' ? 'warn' : 'info';
    logger[logMethod](`Build event: ${event}`, {
        userId: userId?.toString(),
        buildId: buildId?.toString(),
        tag
    });
}
