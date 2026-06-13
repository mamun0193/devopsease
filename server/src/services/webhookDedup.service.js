import { getRedisClient } from '../redis/client.js';
import logger from '../utils/logger.js';

// In-memory fallback
const memoryProcessedDeliveries = new Set();
const memoryDeliveryOrder = [];
const MAX_MEMORY_DELIVERIES = 10000;
const DEDUP_TTL_SECONDS = 86400; // 24 hours

export async function isDuplicate(deliveryId) {
    if (!deliveryId) return false;

    const redis = getRedisClient();
    if (redis) {
        try {
            const exists = await redis.exists(`webhook:delivery:${deliveryId}`);
            return exists === 1;
        } catch (err) {
            logger.warn('Redis dedup check failed, falling back to memory', { error: err.message });
            // Fallback continues below
        }
    }

    // In-memory fallback
    return memoryProcessedDeliveries.has(deliveryId);
}

export async function markProcessed(deliveryId) {
    if (!deliveryId) return;

    const redis = getRedisClient();
    if (redis) {
        try {
            // SET NX EX ensures atomic check-and-set and expiration
            const result = await redis.set(`webhook:delivery:${deliveryId}`, '1', 'EX', DEDUP_TTL_SECONDS, 'NX');
            if (result === 'OK') {
                return;
            }
        } catch (err) {
            logger.warn('Redis dedup set failed, falling back to memory', { error: err.message });
            // Fallback continues below
        }
    }

    // In-memory fallback
    if (!memoryProcessedDeliveries.has(deliveryId)) {
        memoryProcessedDeliveries.add(deliveryId);
        memoryDeliveryOrder.push(deliveryId);

        if (memoryDeliveryOrder.length > MAX_MEMORY_DELIVERIES) {
            const oldest = memoryDeliveryOrder.shift();
            if (oldest) memoryProcessedDeliveries.delete(oldest);
        }
    }
}
