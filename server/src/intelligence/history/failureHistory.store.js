/*
 * In-memory failure history store
 * Keyed by containerId or containerName
 */

const historyStore = new Map();   //Fast lookup,Clean lifecycle and Easy to swap with DB later

// Record a failure occurrence
export function recordFailure(containerKey, failure) {
  if (!containerKey || !failure) return;

  const entry = {
    category: failure.category,
    confidence: failure.confidence,
    stage: failure.stage,
    at: new Date().toISOString()
  };

  if (!historyStore.has(containerKey)) {
    historyStore.set(containerKey, []);
  }

  historyStore.get(containerKey).push(entry);
}

// Get recent failures for a container
export function getFailureHistory(containerKey, limit = 10) {
  const history = historyStore.get(containerKey) || [];
  return history.slice(-limit);
}
