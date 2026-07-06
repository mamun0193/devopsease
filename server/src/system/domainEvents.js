import platformEventBus from '../events/platformEventBus.js';

// ponytail: Backward-compatible shim — delegates to unified PlatformEventBus.
// Existing `domainEvents.emitDomainEvent(DOMAIN_EVENTS.X, payload)` calls work unchanged.

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
    CERTIFICATE_RENEWAL_FAILED: 'CERTIFICATE_RENEWAL_FAILED',
};

const domainEvents = {
    emitDomainEvent(eventName, payload) {
        return platformEventBus.emitDomainEvent(eventName, {
            ...payload,
            timestamp: new Date().toISOString(),
        });
    },
    on(event, handler) {
        platformEventBus.on(event, handler);
    },
    off(event, handler) {
        platformEventBus.off(event, handler);
    },
    emit(event, ...args) {
        platformEventBus.emit(event, ...args);
    },
    setMaxListeners() {},
};

export default domainEvents;
