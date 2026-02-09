import logger from "../utils/logger.js";

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  const code = err.errorCode || "INTERNAL_ERROR";

  // Log only 500s as errors, others as warnings/info
  if (statusCode >= 500) {
    logger.error(`Error processing request ${req.method} ${req.url}`, {
      error: err.message,
      stack: err.stack,
    });
  } else {
    logger.warn(`Operational error ${req.method} ${req.url}`, {
      message: err.message,
      code: err.errorCode,
    });
  }

  res.status(statusCode).json({
    success: false,
    error: true,
    message: message,
    code: code,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

export default errorHandler;
