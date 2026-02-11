import { canPerform } from '../config/permissions.js';
import AppError from '../utils/AppError.js';
import logger from '../utils/logger.js';

// Middleware to enforce Role-Based Access Control composed with Ownership.

export const requirePermission = (actionType) => {
    return (req, res, next) => {
        try {
            const userRole = req.user?.role;

            // ownershipGuard sets req.ownsResource.
            
            const ownsResource = req.ownsResource !== undefined ? req.ownsResource : true;

            const allowed = canPerform({
                role: userRole,
                ownsResource,
                actionType
            });

            if (!allowed) {
                logger.warn(`RBAC Denied: Role ${userRole} tried ${actionType} on resource (owns=${ownsResource})`);
                return next(new AppError("Access Denied: You do not have permission to perform this action", 403));
            }

            next();
        } catch (error) {
            next(error);
        }
    };
};
