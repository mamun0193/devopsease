import { analyzeExitCode } from './exitCodes.js';
import { analyzeContainerState } from './containerState.js';
import { analyzeRestartBehavior } from './restartBehavior.js';
import { analyzeLogs } from './logPatterns.js';

/**
 * Collect all failure signals from container data
 */

export function collectSignals({
  state,
  exitCode,
  restartCount,
  logs
}) {
  const signals = [];

  const exitSignal = analyzeExitCode(exitCode);
  if (exitSignal) signals.push(exitSignal);

  const stateSignal = analyzeContainerState(state);
  if (stateSignal) signals.push(stateSignal);

  const restartSignal = analyzeRestartBehavior(restartCount);
  if (restartSignal) signals.push(restartSignal);

  const logSignals = analyzeLogs(logs);
  if (logSignals) signals.push(...logSignals);

  return signals;
}
