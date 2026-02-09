import AppError from "../utils/AppError.js";

export const ROLES = {
    VIEWER: "viewer",
    OPERATOR: "operator",
};

// Middleware to check if the user has the required role.
// This middleware authenticates based on the 'x-user-role' header.

export const requireRole = (requiredRole) => {
    return (req, res, next) => {
        // Mock Auth: Read role from header, default to 'operator'
        const userRole = req.headers["x-user-role"] || ROLES.OPERATOR;

        if (userRole === ROLES.OPERATOR) {
            return next(); // Operators can do anything
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
