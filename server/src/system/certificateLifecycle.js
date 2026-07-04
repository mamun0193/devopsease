import Certificate from '../models/certificate.model.js';
import logger from '../utils/logger.js';

/**
 * Certificate Lifecycle State Machine
 * 
 * Centralizes all lifecycle transition logic for Certificates.
 * Prevents impossible state transitions and handles overlap prevention.
 * 
 * State Flow:
 * requested → validating → issued → installed → renewing → issued (rotation)
 *                 ↘ validation_failed                ↘ renewal_failed
 *     installed → expired
 *     any → revoked
 *     revoked/expired → replaced (new cert issued)
 */

const VALID_TRANSITIONS = Object.freeze({
    requested: ['validating', 'revoked', 'failed'],
    validating: ['issued', 'validation_failed', 'revoked', 'failed'],
    validation_failed: ['requested', 'revoked', 'failed'],
    issued: ['installed', 'revoked', 'failed'],
    installed: ['renewing', 'expired', 'revoked', 'replaced'],
    renewing: ['issued', 'renewal_failed', 'revoked', 'expired'],
    renewal_failed: ['installed', 'revoked', 'expired'], // Reverts to installed state but with error tracked
    expired: ['replaced', 'revoked'],
    revoked: ['replaced'],
    replaced: [],
    failed: ['requested'] // Retry possible
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
            `Invalid certificate transition: ${currentStatus} → ${newStatus}. ` +
            `Allowed transitions from '${currentStatus}': [${allowed.join(', ')}]`
        );
    }
}

/**
 * Atomically transition a Certificate to a new status.
 * Validates the transition, updates the database, and returns the updated certificate.
 */
export async function transition(certificateId, newStatus) {
    const certificate = await Certificate.findById(certificateId).lean();
    if (!certificate) return null;

    const currentStatus = certificate.status;
    validateTransition(currentStatus, newStatus);

    const updates = { status: newStatus };
    if (newStatus === 'installed') {
        updates.installedAt = new Date();
    } else if (newStatus === 'revoked') {
        updates.revokedAt = new Date();
    }

    const result = await Certificate.updateOne(
        { _id: certificateId, status: currentStatus },
        { $set: updates }
    );

    if (result.modifiedCount === 0) {
        throw new Error(`State transition failed: Certificate ${certificateId} modified concurrently or not found.`);
    }

    logger.debug(`[CertificateLifecycle] ${certificateId}: ${currentStatus} → ${newStatus}`);
    
    // Return updated document structure for the caller
    return { ...certificate, ...updates };
}

export { VALID_TRANSITIONS };
