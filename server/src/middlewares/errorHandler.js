const logger = require("../utils/logger");

function errorHandler(err, req, res, next) {
  logger.error(err.message || "Internal Server Error", {
    stack: err.stack,
    method: req.method,
    path: req.originalUrl,
    timestamp: new Date().toISOString(),
  });
  res.status(err.status || 500).json({
    success: false,
    data: null,
    message: err.message || "Internal Server Error",
  });
}
module.exports = errorHandler;
