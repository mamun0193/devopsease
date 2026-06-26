import logger from "../utils/logger.js";

const REQUIRED_VARS = [
    "PORT",
    "MONGO_URI",
    "JWT_SECRET",
    "ENCRYPTION_KEY",
    // "GITHUB_CLIENT_ID", // Optional if auth not enabled? But present in .env
    // "GITHUB_CLIENT_SECRET",
    // "GOOGLE_CLIENT_ID",
    // "GOOGLE_CLIENT_SECRET",
    // "ADMIN_EMAIL",
    // "ADMIN_PASSWORD"
];

export function validateEnv() {
    const missing = REQUIRED_VARS.filter((key) => !process.env[key]);

    if (missing.length > 0) {
        logger.error("CRTICAL: Missing required environment variables", { missing });
        // forceful exit is okay here as it's startup
        process.exit(1);
    }

    // Soft validation for tunnel provider
    const tunnelProvider = process.env.TUNNEL_PROVIDER;
    if (tunnelProvider === 'ngrok' && !process.env.NGROK_AUTH_TOKEN) {
        logger.warn("NGROK_AUTH_TOKEN is not set — tunnel creation will fail until configured");
    }

    if (!process.env.WEBHOOK_SECRET) {
        logger.warn("WEBHOOK_SECRET is not set — GitHub webhook signature verification will fail");
    }

    // Default GATEWAY_BASE_URL for Application Gateway
    if (!process.env.GATEWAY_BASE_URL) {
        process.env.GATEWAY_BASE_URL = 'http://localhost:5173';
    }

    logger.info("Environment validated", {
        nodeEnv: process.env.NODE_ENV,
        dockerSocket: process.env.DOCKER_SOCKET_PATH,
        tunnelProvider: tunnelProvider || 'none',
        gatewayBaseUrl: process.env.GATEWAY_BASE_URL,
    });
}
