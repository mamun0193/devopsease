import AppError from "../utils/AppError.js";

export const ROLES = {
    ADMIN: "admin",
    OPERATOR: "operator",
    VIEWER: "viewer",
};

// Middleware to check if the user has the required role.
// This middleware authenticates based on the 'req.user' populated by authMiddleware.

export const requireRole = (requiredRole) => {
    return (req, res, next) => {
        // Use req.user which is populated by authMiddleware
        const userRole = req.user?.role || ROLES.VIEWER;

        // Admin always has access
        if (userRole === ROLES.ADMIN) {
            return next();
        }

        if (userRole === ROLES.OPERATOR) {
            // Operator has access to everything except strictly Admin-only routes (if any)
            return next();
        }

        if (requiredRole === ROLES.OPERATOR && userRole !== ROLES.OPERATOR) {
            return next(
                new AppError(
                    "Operator permission required for this action",
                    403,
                    "RBAC_DENIED"
                )
            );
        }

        next();
    };
};
