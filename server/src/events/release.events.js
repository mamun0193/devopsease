import { EventEmitter } from 'events';
import crypto from 'crypto';
import logger from '../utils/logger.js';

class ReleaseEventEmitter extends EventEmitter {
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
        this.emit(eventName, envelope);
    }
}

const releaseEvents = new ReleaseEventEmitter();
releaseEvents.setMaxListeners(20);

export default releaseEvents;
