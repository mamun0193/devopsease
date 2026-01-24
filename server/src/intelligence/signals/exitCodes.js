/* *Exit Code Signals
 * Detect failure signals based on container exit codes.
 */

export function analyzeExitCode(exitCode) {
  if (exitCode === null || exitCode === undefined) {
    return null;
  }

  if (exitCode === 0) {
    return null;
  }

  if (exitCode === 137) {
    return {
      signal: 'OOM_KILLED',
      severity: 'high',
      reason: 'Container was killed due to out-of-memory'
    };
  }

  return {
    signal: 'NON_ZERO_EXIT',
    severity: 'medium',
    reason: `Container exited with code ${exitCode}`
  };
}
