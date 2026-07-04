import { EventEmitter } from 'events';
import crypto from 'crypto';
import logger from '../utils/logger.js';
import { getRedisClient, isRedisConnected } from '../redis/client.js';

class ReleaseEventEmitter extends EventEmitter {
    constructor() {
        super();
        this.REDIS_CHANNEL = 'platform:events:release';
        
        // Setup Redis subscriber if available
        setTimeout(() => {
            if (isRedisConnected()) {
                const subClient = getRedisClient().duplicate();
                subClient.subscribe(this.REDIS_CHANNEL, (err, count) => {
                    if (err) logger.error(`[ReleaseEventEmitter] Redis Subscribe Error: ${err.message}`);
                    else logger.info(`[ReleaseEventEmitter] Subscribed to Redis channel ${this.REDIS_CHANNEL}`);
                });
                
                subClient.on('message', (channel, message) => {
                    if (channel === this.REDIS_CHANNEL) {
                        try {
                            const { eventName, envelope } = JSON.parse(message);
                            // Ensure we don't emit a locally published event again if we can track it, 
                            // but for now we just emit locally.
                            this.emit(eventName, envelope);
                        } catch (e) {
                            logger.error('[ReleaseEventEmitter] Failed to parse Redis message', { error: e.message });
                        }
                    }
                });
            }
        }, 1000);
    }

    /**
     * Emits a standardized domain event envelope
     * @param {string} eventName 
     * @param {object} payload 
     * @param {string} resourceType 
     * @param {string} resourceId 
     */
    emitDomainEvent(eventName, payload, resourceType, resourceId) {
        const envelope = {
            eventVersion: '1.0',
            correlationId: crypto.randomUUID(),
            occurredAt: new Date(),
            resourceType,
            resourceId: String(resourceId),
            payload
        };
        
        logger.debug(`[DomainEvent] ${eventName}`, { resourceId: envelope.resourceId });
        
        // Broadcast via Redis if connected, otherwise just emit locally
        if (isRedisConnected()) {
            const redis = getRedisClient();
            redis.publish(this.REDIS_CHANNEL, JSON.stringify({ eventName, envelope })).catch(err => {
                 logger.error(`[ReleaseEventEmitter] Publish failed: ${err.message}`);
                 this.emit(eventName, envelope); // fallback
            });
        } else {
            this.emit(eventName, envelope);
        }
    }
}

const releaseEvents = new ReleaseEventEmitter();
releaseEvents.setMaxListeners(20);

export default releaseEvents;
