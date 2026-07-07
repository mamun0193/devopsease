import platformEventBus, { DOMAINS, SEVERITIES } from '../events/platformEventBus.js';
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
    [BUILD_EVENTS.BUILD_STARTED]: SEVERITIES.INFO,
    [BUILD_EVENTS.BUILD_SUCCESS]: SEVERITIES.INFO,
    [BUILD_EVENTS.BUILD_FAILED]: SEVERITIES.WARNING,
    [BUILD_EVENTS.BUILD_MANIFEST_GENERATED]: SEVERITIES.INFO,
    [BUILD_EVENTS.CACHE_PLAN_READY]: SEVERITIES.INFO,
    [BUILD_EVENTS.BUILD_CACHE_HIT]: SEVERITIES.INFO,
    [BUILD_EVENTS.BUILD_CACHE_MISS]: SEVERITIES.INFO
};

export function logBuildEvent({ event, userId, buildId, tag, metadata = {} }) {
    const severity = SEVERITY_MAP[event] || SEVERITIES.INFO;

    platformEventBus.publish(DOMAINS.BUILD, event, {
        severity,
        userId,
        resourceType: 'Build',
        resourceId: buildId,
        payload: {
            tag,
            ...metadata
        }
    });

    const logMethod = severity === SEVERITIES.WARNING ? 'warn' : 'info';
    logger[logMethod](`Build event: ${event}`, {
        userId: userId?.toString(),
        buildId: buildId?.toString(),
        tag
    });
}
