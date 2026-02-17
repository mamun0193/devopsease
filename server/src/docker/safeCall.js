import logger from "../utils/logger.js";

export class DockerError extends Error {
    constructor(message, code, statusCode, context, originalError) {
        super(message);
        this.name = "DockerError";
        this.code = code;
        this.statusCode = statusCode;
        this.context = context;
        this.originalError = originalError;
    }

    toStructured() {
        return {
            success: false,
            error: {
                code: this.code,
                message: this.message,
                context: this.context
            },
            statusCode: this.statusCode
        };
    }
}

// Wraps a Docker operation with a timeout and structured error handling.

export async function safeDockerCall(operation, contextLabel, timeoutMs = 5000) {
    try {
        return await Promise.race([
            operation(),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error("DOCKER_TIMEOUT")), timeoutMs)
            ),
        ]);
    } catch (err) {
        const errorObj = normalizeDockerError(err, contextLabel);

        // Log the error
        logger.error(`Docker operation failed: ${contextLabel}`, {
            error: errorObj.message,
            code: errorObj.code
        });

        throw errorObj;
    }
}

function normalizeDockerError(err, context) {
    if (err instanceof DockerError) return err;

    let code = "DOCKER_OPERATION_FAILED";
    let message = err.message || "Unknown Docker error";
    let statusCode = 500;

    if (message.includes("DOCKER_TIMEOUT")) {
        code = "DOCKER_TIMEOUT";
        message = "Docker operation timed out after 5000ms";
        statusCode = 504;
    } else if (err.statusCode === 404 || message.includes("No such container") || message.includes("No such image")) {
        code = "RESOURCE_NOT_FOUND";
        message = "Docker resource not found";
        statusCode = 404;
    } else if (err.code === "ECONNREFUSED" || err.code === "ENOENT") {
        code = "DOCKER_UNOREACHABLE";
        message = "Docker daemon is unreachable";
        statusCode = 503;
    } else if (err.statusCode === 304) {
        code = "NOT_MODIFIED";
        statusCode = 304;
    }

    return new DockerError(message, code, statusCode, context, err);
}
