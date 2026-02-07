import readinessService from "../services/readiness.service.js";

function readinessMiddleware(req, res, next) {
    if (req.path.startsWith("/health")) {
        return next();
    }

    if (!readinessService.isReady()) {
        return res.status(503).json({
            success: false,
            initializing: true,
            status: readinessService.getStatus(),
            message: "Server is initializing, please wait...",
        });
    }

    next();
}

export default readinessMiddleware;
