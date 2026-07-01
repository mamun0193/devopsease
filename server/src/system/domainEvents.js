import { EventEmitter } from 'events';
import logger from '../utils/logger.js';

class DomainEventBus extends EventEmitter {
    constructor() {
        super();
        // Prevent max listeners warning if many subsystems subscribe
        this.setMaxListeners(50);
    }

    emitDomainEvent(eventName, payload) {
        try {
            logger.debug(`[DomainEvent] Emitting ${eventName}`, { repoId: payload?.repoId });
            this.emit(eventName, {
                ...payload,
                timestamp: new Date().toISOString()
            });
        } catch (err) {
            logger.error(`[DomainEvent] Failed to emit ${eventName}`, { error: err.message });
        }
    }
}

export const DOMAIN_EVENTS = {
    BUILD_CONTEXT_HASHED: 'BUILD_CONTEXT_HASHED',
    DEPENDENCIES_ANALYZED: 'DEPENDENCIES_ANALYZED',
    DOCKERFILE_ANALYZED: 'DOCKERFILE_ANALYZED',
    CACHE_PLAN_READY: 'CACHE_PLAN_READY'
};

const domainEvents = new DomainEventBus();
export default domainEvents;
