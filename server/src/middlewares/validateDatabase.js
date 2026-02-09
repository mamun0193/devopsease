import { isDBConnected } from '../config/db.js';
import AppError from '../utils/AppError.js';

// Circuit Breaker Middleware
// Immediately fails requests if the primary database is unavailable.
// This prevents requests from hanging or failing with obscure timeouts.
export const validateDatabase = (req, res, next) => {
    // Skip for health checks if needed, but generally strict
    if (req.path === '/health') {
        return next();
    }

    if (!isDBConnected()) {
        res.set('Retry-After', '30');
        // 503 Service Unavailable
        return next(new AppError("System temporarily unavailable: Database disconnected", 503));
    }

    next();
};
