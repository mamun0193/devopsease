import ownershipService from '../services/ownership.service.js';
import SecurityLog from '../models/SecurityLog.js';
import { ROLES } from './rbac.js';
import AppError from '../utils/AppError.js';
import logger from '../utils/logger.js';

// Environment variable to control operator bypass
const ALLOW_OPERATOR_BYPASS = process.env.ALLOW_OPERATOR_BYPASS === 'true';

/**
 * Middleware factory to guard container routes based on ownership.
 * @param {string} actionName - The action being performed (e.g., 'stop', 'logs', 'exec')
 */
export const ownershipGuard = (actionName) => {
    return async (req, res, next) => {
        try {
            const userId = req.user?._id || req.user?.userId;
            const userRole = req.user?.role;
            const containerId = req.params.id; // Assuming route is like /containers/:id/*

            if (!containerId) {
                // If no containerId in params, this middleware might be misplaced or on a general route
                // For general routes (like list), this guard shouldn't be used or should be adapted.
                // We proceed if there's no ID to check, but log a warning? 
                // Actually, strict guard should fail if expected ID is missing.
                return next(new AppError("Container ID required for ownership check", 400));
            }

            // 1. Admin Bypass
            if (userRole === 'admin') {
                return next();
            }

            // 2. Operator Bypass (Configurable)
            if (userRole === ROLES.OPERATOR && ALLOW_OPERATOR_BYPASS) {
                return next();
            }

            // 3. Ownership Check
            const hasAccess = await ownershipService.hasOwnership(userId, containerId);

            if (hasAccess) {
                return next();
            }

            // 4. Denied Access Handling
            logger.warn(`Access Denied: User ${userId} tried to ${actionName} container ${containerId}`);

            // Log security event (async, don't block response)
            SecurityLog.create({
                userId,
                containerId,
                action: actionName,
                result: 'denied',
                metadata: {
                    ip: req.ip,
                    userAgent: req.get('User-Agent')
                }
            }).catch(err => logger.error('Failed to write security log', { error: err.message }));

            return next(new AppError("Access Denied: You do not own this container", 403));

        } catch (error) {
            next(error);
        }
    };
};
