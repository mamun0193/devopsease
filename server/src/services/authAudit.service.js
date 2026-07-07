import platformEventBus, { DOMAINS, SEVERITIES } from "../events/platformEventBus.js";
import logger from "../utils/logger.js";

export const AUTH_EVENTS = {
    LOGIN_SUCCESS: 'AUTH_LOGIN_SUCCESS',
    LOGIN_FAILED: 'AUTH_LOGIN_FAILED',
    REFRESH_SUCCESS: 'AUTH_REFRESH_SUCCESS',
    REFRESH_FAILED: 'AUTH_REFRESH_FAILED',
    LOGOUT: 'AUTH_LOGOUT',
    REUSE_DETECTED: 'AUTH_REUSE_DETECTED',
    RATE_LIMITED: 'AUTH_RATE_LIMITED',
};

const SEVERITY_MAP = {
    [AUTH_EVENTS.LOGIN_SUCCESS]: SEVERITIES.INFO,
    [AUTH_EVENTS.LOGIN_FAILED]: SEVERITIES.WARNING,
    [AUTH_EVENTS.REFRESH_SUCCESS]: SEVERITIES.INFO,
    [AUTH_EVENTS.REFRESH_FAILED]: SEVERITIES.WARNING,
    [AUTH_EVENTS.LOGOUT]: SEVERITIES.INFO,
    [AUTH_EVENTS.REUSE_DETECTED]: SEVERITIES.CRITICAL,
    [AUTH_EVENTS.RATE_LIMITED]: SEVERITIES.WARNING,
};

/**
 * Fire-and-forget auth audit logging.
 * Never blocks the request, never throws.
 */
export function logAuthEvent({ event, userId = null, email = null, ip = null, userAgent = null, metadata = {} }) {
    const severity = SEVERITY_MAP[event] || SEVERITIES.INFO;
    const result = event.includes('SUCCESS') || event === AUTH_EVENTS.LOGOUT ? 'allowed' : 'denied';

    platformEventBus.publish(DOMAINS.AUTH, event, {
        severity,
        userId,
        payload: {
            reason: `Authentication ${result}`,
            result,
            email,
            ip,
            userAgent,
            ...metadata
        }
    });

    // Also log to structured logger for real-time observability
    const logMethod = severity === SEVERITIES.CRITICAL ? 'error' : severity === SEVERITIES.WARNING ? 'warn' : 'info';
    logger[logMethod](`Auth event: ${event}`, {
        userId: userId?.toString(),
        email,
        ip,
        severity,
    });
}
