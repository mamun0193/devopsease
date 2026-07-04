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
    CACHE_PLAN_READY: 'CACHE_PLAN_READY',
    
    // Domain Events
    DOMAIN_CREATED: 'DOMAIN_CREATED',
    DOMAIN_VERIFIED: 'DOMAIN_VERIFIED',
    DOMAIN_VERIFICATION_FAILED: 'DOMAIN_VERIFICATION_FAILED',
    DOMAIN_CONNECTED: 'DOMAIN_CONNECTED',
    DOMAIN_DISCONNECTED: 'DOMAIN_DISCONNECTED',
    DOMAIN_ARCHIVED: 'DOMAIN_ARCHIVED',
    DOMAIN_HEALTH_CHANGED: 'DOMAIN_HEALTH_CHANGED',
    
    // Certificate Events
    CERTIFICATE_REQUESTED: 'CERTIFICATE_REQUESTED',
    CERTIFICATE_ISSUED: 'CERTIFICATE_ISSUED',
    CERTIFICATE_INSTALLED: 'CERTIFICATE_INSTALLED',
    CERTIFICATE_RENEWED: 'CERTIFICATE_RENEWED',
    CERTIFICATE_EXPIRED: 'CERTIFICATE_EXPIRED',
    CERTIFICATE_REVOKED: 'CERTIFICATE_REVOKED',
    CERTIFICATE_RENEWAL_FAILED: 'CERTIFICATE_RENEWAL_FAILED'
};

const domainEvents = new DomainEventBus();
export default domainEvents;
