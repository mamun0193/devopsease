/**
 * Failure Model
 * -------------
 * This defines the standard structure of a failure object
 * used across the system.
 */

export default function createFailure({
  category,
  stage,
  confidence = 'low',
  reasons = [],
  metadata = {}
}) {
  return {
    category,
    stage,
    confidence,   // low | medium | high
    reasons,      // array of signal-based reasons
    metadata,     // raw data for debugging / UI
    detectedAt: new Date().toISOString()
  };
};
