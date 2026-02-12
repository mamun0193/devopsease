import SecurityLog from "../models/SecurityLog.js";
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
    [AUTH_EVENTS.LOGIN_SUCCESS]: 'INFO',
    [AUTH_EVENTS.LOGIN_FAILED]: 'WARN',
    [AUTH_EVENTS.REFRESH_SUCCESS]: 'INFO',
    [AUTH_EVENTS.REFRESH_FAILED]: 'WARN',
    [AUTH_EVENTS.LOGOUT]: 'INFO',
    [AUTH_EVENTS.REUSE_DETECTED]: 'HIGH',
    [AUTH_EVENTS.RATE_LIMITED]: 'WARN',
};

/**
 * Fire-and-forget auth audit logging.
 * Never blocks the request, never throws.
 */
export function logAuthEvent({ event, userId = null, email = null, ip = null, userAgent = null, metadata = {} }) {
    const severity = SEVERITY_MAP[event] || 'INFO';

    // Fire and forget — don't await
    SecurityLog.create({
        userId,
        action: event,
        result: event.includes('SUCCESS') || event === AUTH_EVENTS.LOGOUT ? 'allowed' : 'denied',
        severity,
        email,
        ip,
        userAgent,
        metadata,
    }).catch((error) => {
        logger.warn("Auth audit log write failed", { event, error: error.message });
    });

    // Also log to structured logger for real-time observability
    const logMethod = severity === 'HIGH' ? 'error' : severity === 'WARN' ? 'warn' : 'info';
    logger[logMethod](`Auth event: ${event}`, {
        userId: userId?.toString(),
        email,
        ip,
        severity,
    });
}
