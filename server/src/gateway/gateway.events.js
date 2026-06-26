import { EventEmitter } from 'events';

/**
 * Gateway Events — Central event bus for gateway cache invalidation.
 *
 * Events:
 *   'deployment:finished'       — { deploymentId, repoId }
 *   'deployment:rollback'       — { deploymentId, repoId }
 *   'application:updated'       — { applicationId, slug }
 *   'application:deleted'       — { applicationId, slug }
 */
const gatewayEvents = new EventEmitter();

// Prevent memory leaks with many listeners
gatewayEvents.setMaxListeners(50);

export default gatewayEvents;
