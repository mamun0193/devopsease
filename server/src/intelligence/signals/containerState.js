/**
 * Container State Signals
 * Analyze Docker container state for failure hints.
 */

export function analyzeContainerState(state) {
  if (!state) return null;

  if (state.OOMKilled) {
    return {
      signal: 'OOM_STATE',
      severity: 'high',
      reason: 'Docker reports container was OOM killed'
    };
  }

  if (!state.Running && state.ExitCode !== 0) {
    return {
      signal: 'EXITED_UNEXPECTEDLY',
      severity: 'medium',
      reason: 'Container exited unexpectedly'
    };
  }

  return null;
}
