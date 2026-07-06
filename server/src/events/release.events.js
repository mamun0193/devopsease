import platformEventBus from './platformEventBus.js';

// ponytail: Backward-compatible shim — delegates to unified PlatformEventBus.
// All existing `releaseEvents.emitDomainEvent(...)` calls continue to work unchanged.
// All existing `releaseEvents.on(...)` listeners continue to work unchanged
// because PlatformEventBus emits on eventType channels.

const releaseEvents = {
    emitDomainEvent(eventName, payload, resourceType, resourceId) {
        return platformEventBus.emitDomainEvent(eventName, payload, resourceType, resourceId);
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
    setMaxListeners() {
        // no-op — managed by platformEventBus
    },
};

export default releaseEvents;
