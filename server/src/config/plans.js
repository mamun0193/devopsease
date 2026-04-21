export const PLANS = {
    free: {
        price: 0,
        maxContainers: 2,
        maxCPU: 1,            // 1 core total across all containers
        maxMemoryMB: 512,     // 512 MB total across all containers
        maxStorageMB: 1024,   // 1 GB
        storageType: 'ephemeral',

        // Docker-compatible format strings (used by deployment runner)
        cpu: '1',
        memory: '512m',
        storage: '1GB',

        rateLimits: {
            create: { limit: 5, window: 3600 },        // 5 per hour
            exec: { limit: 10, window: 60 },           // 10 per minute
            destructive: { limit: 5, window: 60 },     // 5 per minute (stop, remove, restart)
        }
    },
    pro: {
        price: 199,
        maxContainers: 10,
        maxCPU: 4,            // 4 cores total
        maxMemoryMB: 4096,    // 4 GB total
        maxStorageMB: 10240,  // 10 GB
        storageType: 'persistent',

        // Docker-compatible format strings
        cpu: '4',
        memory: '4g',
        storage: '10GB',

        rateLimits: {
            create: { limit: 20, window: 3600 },
            exec: { limit: 60, window: 60 },
            destructive: { limit: 20, window: 60 },
        }
    },
    premium: {
        price: 399,
        maxContainers: 20,
        maxCPU: 8,            // 8 cores total
        maxMemoryMB: 16384,   // 16 GB total
        maxStorageMB: 25600,  // 25 GB
        storageType: 'persistent',

        // Docker-compatible format strings
        cpu: '8',
        memory: '16g',
        storage: '25GB',

        rateLimits: {
            create: { limit: 50, window: 3600 },
            exec: { limit: 300, window: 60 },
            destructive: { limit: 100, window: 60 },
        }
    }
};

// Default plan if none specified
export const DEFAULT_PLAN = 'free';
