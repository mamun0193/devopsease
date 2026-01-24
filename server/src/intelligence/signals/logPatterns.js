/**
 * Log Pattern Signals
 * Detect common failure patterns from logs.
 */

const PATTERNS = [
  {
    regex: /ECONNREFUSED/i,
    signal: 'CONNECTION_REFUSED',
    severity: 'high',
    reason: 'Service connection refused (likely dependency not reachable)'
  },
  {
    regex: /EADDRINUSE/i,
    signal: 'PORT_IN_USE',
    severity: 'medium',
    reason: 'Port already in use'
  },
  {
    regex: /Cannot find module/i,
    signal: 'MODULE_NOT_FOUND',
    severity: 'high',
    reason: 'Required module not found'
  },
  {
    regex: /UnhandledPromiseRejection/i,
    signal: 'UNHANDLED_REJECTION',
    severity: 'medium',
    reason: 'Unhandled promise rejection detected'
  }
];

export function analyzeLogs(logs = '') {
  const signals = [];

  for (const pattern of PATTERNS) {
    if (pattern.regex.test(logs)) {
      signals.push({
        signal: pattern.signal,
        severity: pattern.severity,
        reason: pattern.reason
      });
    }
  }

  return signals.length ? signals : null;
}
