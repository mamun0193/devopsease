export const PLANS = {
    free: {
        maxContainers: 2,
        rateLimits: {
            create: { limit: 5, window: 3600 },        // 2 per hour
            exec: { limit: 10, window: 60 },           // 10 per minute
            destructive: { limit: 5, window: 60 },     // 5 per minute (stop, remove, restart)
        }
    },
    pro: {
        maxContainers: 10,
        rateLimits: {
            create: { limit: 20, window: 3600 },
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
