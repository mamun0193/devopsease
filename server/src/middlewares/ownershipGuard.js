import ownershipService from '../services/ownership.service.js';
import platformEventBus from '../events/platformEventBus.js';
import { ROLES } from './rbac.js';
import AppError from '../utils/AppError.js';
import logger from '../utils/logger.js';

// Environment variable to control operator bypass
// DISABLED for Day 35: Operators must strictly own resources
const ALLOW_OPERATOR_BYPASS = false;

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
                return next(new AppError("Container ID required for ownership check", 400));
            }

            // 1. Admin Bypass
            if (userRole === 'admin') {
                req.ownsResource = false; // Admins bypass ownership; RBAC will handle "any" access
                return next();
            }

            // 2. Operator Bypass - DISABLED
            // Strict ownership required for Day 35

            // 3. Ownership Check
            const hasAccess = await ownershipService.hasOwnership(userId, containerId);

            if (hasAccess) {
                req.ownsResource = true; // Signal for RBAC
                return next();
            }

            // 4. Denied Access Handling
            logger.warn(`Access Denied: User ${userId} tried to ${actionName} container ${containerId}`);

            // Log security event (async, don't block response)
            platformEventBus.publish('SECURITY', 'ACCESS_DENIED', {
                severity: 'WARNING',
                userId,
                resourceId: containerId,
                resourceType: 'Container',
                payload: {
                    summary: `Access Denied: User tried to ${actionName} container`,
                    metadata: {
                        ip: req.ip,
                        userAgent: req.get('User-Agent')
                    }
                }
            });

            return next(new AppError("Access Denied: You do not own this container", 403));

        } catch (error) {
            next(error);
        }
    };
};
