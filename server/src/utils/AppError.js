class AppError extends Error {
    constructor(message, statusCode, errorCode) {
        super(message);
        this.statusCode = statusCode;
        this.errorCode = errorCode;
        this.isOperational = true; // Distinguish operational errors from programming bugs
        Error.captureStackTrace(this, this.constructor);
    }
}

export default AppError;
