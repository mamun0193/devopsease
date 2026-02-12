import AppError from "../utils/AppError.js";

export const ROLES = {
    ADMIN: "admin",
    OPERATOR: "operator",
};

// Middleware to check if the user has the required role.
// req.user is populated by authMiddleware.

export const requireRole = (requiredRole) => {
    return (req, res, next) => {
        const userRole = req.user?.role;

        if (!userRole) {
            return next(new AppError("Authentication required", 401));
        }

        // Admin always has access
        if (userRole === ROLES.ADMIN) {
            return next();
        }

        // Operator has access to operator-level and below
        if (userRole === ROLES.OPERATOR && requiredRole === ROLES.OPERATOR) {
            return next();
        }

        return next(
            new AppError(
                "You do not have permission to perform this action",
                403,
                "RBAC_DENIED"
            )
        );
    };
};
