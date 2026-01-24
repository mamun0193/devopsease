/**
 * Restart Behavior Signals
 * Detect crash loops and unstable containers.
 */

export function analyzeRestartBehavior(restartCount) {
  if (restartCount === undefined || restartCount === null) {
    return null;
  }

  if (restartCount >= 5) {
    return {
      signal: 'CRASH_LOOP',
      severity: 'high',
      reason: `Container restarted ${restartCount} times`
    };
  }

  if (restartCount > 0) {
    return {
      signal: 'RESTARTED',
      severity: 'low',
      reason: `Container restarted ${restartCount} times`
    };
  }

  return null;
}
