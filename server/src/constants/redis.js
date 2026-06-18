// Redis key prefix constants

export const REDIS_KEY_RATE_LIMIT = (userId, actionType) => `rate:${userId}:${actionType}`;
export const REDIS_KEY_WEBHOOK_DEDUP = (deliveryId) => `webhook:dedup:${deliveryId}`;
export const REDIS_KEY_BUILD_ACTIVE = (buildId) => `build:active:${buildId}`;
export const REDIS_KEY_METRICS_CONTAINER = (containerId) => `metrics:container:${containerId}`;
export const REDIS_KEY_METRICS_LEADER = 'metrics:leader';
export const REDIS_KEY_BRUTE_FORCE = (ip) => `auth:brute:${ip}`;
export const REDIS_KEY_AUTH_AUDIT = (userId) => `auth:audit:${userId}`;
export const REDIS_KEY_CONTAINER_SUMMARY = (containerId) => `container:summary:${containerId}`;
export const REDIS_KEY_CONTAINER_LIST = (userId) => `container:list:${userId}`;
