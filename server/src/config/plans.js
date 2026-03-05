export const PLANS = {
    free: {
        maxContainers: 2,
        maxCPU: 1,            // 1 core total across all containers
        maxMemoryMB: 512,     // 512 MB total across all containers
        rateLimits: {
            create: { limit: 5, window: 3600 },        // 2 per hour
            exec: { limit: 10, window: 60 },           // 10 per minute
            destructive: { limit: 5, window: 60 },     // 5 per minute (stop, remove, restart)
        }
    },
    pro: {
        maxContainers: 10,
        maxCPU: 4,            // 4 cores total
        maxMemoryMB: 4096,    // 4 GB total
        rateLimits: {
            create: { limit: 20, window: 3600 },
            exec: { limit: 60, window: 60 },
            destructive: { limit: 20, window: 60 },
        }
    },
    premium: {
        maxContainers: 20,
        maxCPU: 8,            // 8 cores total
        maxMemoryMB: 16384,   // 16 GB total
        rateLimits: {
            create: { limit: 50, window: 3600 },
            exec: { limit: 300, window: 60 },
            destructive: { limit: 100, window: 60 },
        }
    }
};

// Default plan if none specified
export const DEFAULT_PLAN = 'free';
