import platformEventBus from '../events/platformEventBus.js';

// ponytail: Backward-compatible shim — delegates to unified PlatformEventBus.
// Existing `gatewayEvents.emit('deployment:finished', ...)` calls work unchanged.

const gatewayEvents = {
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

export default gatewayEvents;
