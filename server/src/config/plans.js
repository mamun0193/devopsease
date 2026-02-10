export const PLANS = {
    free: {
        maxContainers: 1,
        rateLimits: {
            // Actions per window (in seconds)
            create: { limit: 2, window: 3600 },       // 2 per hour (generous for testing)
            exec: { limit: 10, window: 60 },          // 10 per minute
            destructive: { limit: 5, window: 60 },    // 5 per minute (stop, remove, restart)
        }
    },
    paid: {
        maxContainers: 5, // Configurable limit for paid users
        rateLimits: {
            create: { limit: 10, window: 3600 },
            exec: { limit: 60, window: 60 },
            destructive: { limit: 20, window: 60 },
        }
    },
    premium: {
        maxContainers: 20,
        rateLimits: {
            create: { limit: 50, window: 3600 },
            exec: { limit: 300, window: 60 },
            destructive: { limit: 100, window: 60 },
        }
    }
};

// Default plan if none specified
export const DEFAULT_PLAN = 'free';
