/**
 * AppError — Base operational error class.
 *
 * All intentional, user-facing errors should extend this class.
 * The global errorHandler middleware reads `statusCode`, `errorCode`,
 * and `isOperational` to produce consistent API error responses.
 *
 * Usage:
 *   throw new NotFoundError('Pipeline not found');
 *   throw new ConflictError('Pipeline already has an active execution.');
 */
class AppError extends Error {
    constructor(message, statusCode, errorCode) {
        super(message);
        this.statusCode = statusCode;
        this.errorCode = errorCode;
        this.isOperational = true; // Distinguish operational errors from programming bugs
        Error.captureStackTrace(this, this.constructor);
    }
}

/** 400 — Request body or parameters are invalid. */
export class ValidationError extends AppError {
    constructor(message, errorCode = 'VALIDATION_ERROR') {
        super(message, 400, errorCode);
    }
}

/** 401 — Missing or invalid authentication credentials. */
export class UnauthorizedError extends AppError {
    constructor(message = 'Authentication required', errorCode = 'UNAUTHORIZED') {
        super(message, 401, errorCode);
    }
}

/** 403 — Authenticated but not permitted to access this resource. */
export class ForbiddenError extends AppError {
    constructor(message = 'Access denied', errorCode = 'FORBIDDEN') {
        super(message, 403, errorCode);
    }
}

/** 404 — Resource does not exist or was not found. */
export class NotFoundError extends AppError {
    constructor(message = 'Resource not found', errorCode = 'NOT_FOUND') {
        super(message, 404, errorCode);
    }
}

/** 409 — Resource state conflict (e.g., duplicate or already active). */
export class ConflictError extends AppError {
    constructor(message, errorCode = 'CONFLICT') {
        super(message, 409, errorCode);
    }
}

/** 429 — Rate limit exceeded for this action. */
export class RateLimitError extends AppError {
    constructor(message = 'Rate limit exceeded', errorCode = 'RATE_LIMIT_EXCEEDED') {
        super(message, 429, errorCode);
    }
}

/** 503 — A required upstream service is unavailable. */
export class ServiceUnavailableError extends AppError {
    constructor(message = 'Service temporarily unavailable', errorCode = 'SERVICE_UNAVAILABLE') {
        super(message, 503, errorCode);
    }
}

export default AppError;
