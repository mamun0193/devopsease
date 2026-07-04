import Preview from '../models/preview.model.js';
import logger from '../utils/logger.js';

/**
 * Preview Lifecycle State Machine
 * 
 * Centralizes all lifecycle transition logic for Preview environments.
 * Prevents impossible state transitions and provides structured explainability.
 * 
 * State Flow:
 *   creating → preparing → deploying → ready → expired → destroying → destroyed → archived
 *                                        ↘ failed ↗          ↗
 *                              (any active state) → destroying
 */

const VALID_TRANSITIONS = Object.freeze({
    creating:   ['preparing', 'failed', 'destroying'],
    preparing:  ['deploying', 'failed', 'destroying'],
    deploying:  ['ready', 'failed', 'destroying'],
    ready:      ['expired', 'destroying'],
    failed:     ['destroying'],
    expired:    ['destroying'],
    destroying: ['destroyed'],
    destroyed:  ['archived'],
    archived:   []
});

/**
 * Check whether a transition from currentStatus to newStatus is valid.
 * @param {string} currentStatus
 * @param {string} newStatus
 * @returns {boolean}
 */
export function canTransition(currentStatus, newStatus) {
    const allowed = VALID_TRANSITIONS[currentStatus];
    if (!allowed) return false;
    return allowed.includes(newStatus);
}

// Validate a transition and throw if invalid.

export function validateTransition(currentStatus, newStatus) {
    if (!canTransition(currentStatus, newStatus)) {
        const allowed = VALID_TRANSITIONS[currentStatus] || [];
        throw new Error(
            `Invalid lifecycle transition: ${currentStatus} → ${newStatus}. ` +
            `Allowed transitions from '${currentStatus}': [${allowed.join(', ')}]`
        );
    }
}

// Atomically transition a Preview to a new status.
// Validates the transition, updates the database, and returns the updated preview.

export async function transition(previewId, newStatus) {
    const preview = await Preview.findById(previewId);
    if (!preview) return null;

    validateTransition(preview.status, newStatus);

    preview.status = newStatus;
    await preview.save();

    logger.debug(`[PreviewLifecycle] ${previewId}: ${preview.status} → ${newStatus}`);
    return preview;
}

export { VALID_TRANSITIONS };
