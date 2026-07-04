import Domain from '../models/domain.model.js';
import logger from '../utils/logger.js';

/**
 * Domain Lifecycle State Machine
 * 
 * Centralizes all lifecycle transition logic for Domains.
 * Prevents impossible state transitions and provides structured explainability.
 * 
 * State Flow:
 * added → pending_verification → verified → connected → healthy → disconnected → archived
 *                 ↘ verification_failed ↗         ↘ unhealthy ↗
 *     connected → disconnected → archived
 *     any active → archived (force cleanup)
 */

const VALID_TRANSITIONS = Object.freeze({
    added: ['pending_verification', 'archived'],
    pending_verification: ['verified', 'verification_failed', 'archived'],
    verification_failed: ['pending_verification', 'archived'],
    verified: ['connected', 'archived'],
    connected: ['healthy', 'unhealthy', 'disconnected', 'archived'],
    healthy: ['unhealthy', 'disconnected', 'archived'],
    unhealthy: ['healthy', 'disconnected', 'archived'],
    disconnected: ['connected', 'archived'],
    archived: []
});

/**
 * Check whether a transition from currentStatus to newStatus is valid.
 */
export function canTransition(currentStatus, newStatus) {
    const allowed = VALID_TRANSITIONS[currentStatus];
    if (!allowed) return false;
    return allowed.includes(newStatus);
}

/**
 * Validate a transition and throw if invalid.
 */
export function validateTransition(currentStatus, newStatus) {
    if (!canTransition(currentStatus, newStatus)) {
        const allowed = VALID_TRANSITIONS[currentStatus] || [];
        throw new Error(
            `Invalid lifecycle transition: ${currentStatus} → ${newStatus}. ` +
            `Allowed transitions from '${currentStatus}': [${allowed.join(', ')}]`
        );
    }
}

/**
 * Atomically transition a Domain to a new status.
 * Validates the transition, updates the database, and returns the updated domain.
 */
export async function transition(domainId, newStatus) {
    const domain = await Domain.findById(domainId).lean();
    if (!domain) return null;

    const currentStatus = domain.status;
    validateTransition(currentStatus, newStatus);

    const updates = { status: newStatus };
    if (newStatus === 'connected') {
        updates.connectedAt = new Date();
    } else if (newStatus === 'disconnected') {
        updates.disconnectedAt = new Date();
    } else if (newStatus === 'archived') {
        updates.archivedAt = new Date();
    }

    const result = await Domain.updateOne(
        { _id: domainId, status: currentStatus },
        { $set: updates }
    );

    if (result.modifiedCount === 0) {
        throw new Error(`State transition failed: Domain ${domainId} modified concurrently or not found.`);
    }

    logger.debug(`[DomainLifecycle] ${domainId}: ${currentStatus} → ${newStatus}`);
    
    // Return updated document structure for the caller
    return { ...domain, ...updates };
}

export { VALID_TRANSITIONS };
