/**
 * Exit Code Signal Analysis
 * Detect failure signals based on container exit codes.
 * Maps common Docker/Linux exit codes to human-readable reasons.
 */

// Exit code mapping with descriptions
const EXIT_CODE_MAP = {
  // 0-10: Success and common exits
  0: { signal: 'SUCCESS', severity: 'low', reason: 'Clean exit' },
  1: { signal: 'GENERAL_ERROR', severity: 'high', reason: 'General error - application crashed' },
  2: { signal: 'MISUSE_ERROR', severity: 'high', reason: 'Misuse of shell command - check entrypoint' },
  3: { signal: 'COMMAND_NOT_FOUND', severity: 'high', reason: 'Command not found' },
  4: { signal: 'SIGNAL_EXIT', severity: 'medium', reason: 'Command exited due to signal' },
  5: { signal: 'SIGNAL_EXIT', severity: 'medium', reason: 'Signal exit' },
  
  // 126-128: Permission and signal issues
  126: { signal: 'PERMISSION_DENIED', severity: 'high', reason: 'Command invoked cannot execute - permission denied' },
  127: { signal: 'COMMAND_NOT_FOUND', severity: 'high', reason: 'Command not found - check entrypoint or PATH' },
  128: { signal: 'INVALID_SIGNAL', severity: 'high', reason: 'Invalid signal number' },
  
  // 128-158: Fatal signal N + 128
  129: { signal: 'SIGHUP', severity: 'medium', reason: 'Hangup signal (SIGHUP)' },
  130: { signal: 'SIGINT', severity: 'medium', reason: 'Interrupt signal (SIGINT) - container stopped' },
  131: { signal: 'SIGQUIT', severity: 'medium', reason: 'Quit signal (SIGQUIT)' },
  132: { signal: 'SIGILL', severity: 'high', reason: 'Illegal instruction (SIGILL)' },
  133: { signal: 'SIGTRAP', severity: 'medium', reason: 'Trace/breakpoint trap (SIGTRAP)' },
  134: { signal: 'SIGABRT', severity: 'high', reason: 'Abort signal (SIGABRT) - application aborted' },
  135: { signal: 'SIGBUS', severity: 'high', reason: 'Bus error (SIGBUS)' },
  136: { signal: 'SIGFPE', severity: 'high', reason: 'Floating point exception (SIGFPE)' },
  137: { signal: 'SIGKILL', severity: 'high', reason: 'Killed (SIGKILL) - out of memory or resource limit' },
  138: { signal: 'SIGUSR1', severity: 'medium', reason: 'User defined signal 1 (SIGUSR1)' },
  139: { signal: 'SIGSEGV', severity: 'high', reason: 'Segmentation fault (SIGSEGV) - memory violation' },
  140: { signal: 'SIGUSR2', severity: 'medium', reason: 'User defined signal 2 (SIGUSR2)' },
  141: { signal: 'SIGPIPE', severity: 'medium', reason: 'Broken pipe (SIGPIPE)' },
  142: { signal: 'SIGALRM', severity: 'medium', reason: 'Alarm clock (SIGALRM)' },
  143: { signal: 'SIGTERM', severity: 'medium', reason: 'Termination signal (SIGTERM) - graceful shutdown' },
  144: { signal: 'SIGCLD', severity: 'medium', reason: 'Child process died (SIGCLD)' },
  145: { signal: 'SIGCONT', severity: 'low', reason: 'Continue (SIGCONT)' },
  146: { signal: 'SIGSTOP', severity: 'medium', reason: 'Stop process (SIGSTOP)' },
  147: { signal: 'SIGTSTP', severity: 'medium', reason: 'Stop typed at terminal (SIGTSTP)' },
  148: { signal: 'SIGTTIN', severity: 'medium', reason: 'Background read attempted (SIGTTIN)' },
  149: { signal: 'SIGTTOU', severity: 'medium', reason: 'Background write attempted (SIGTTOU)' },
  150: { signal: 'SIGURG', severity: 'low', reason: 'Urgent condition on socket (SIGURG)' },
  151: { signal: 'SIGXCPU', severity: 'high', reason: 'CPU time limit exceeded (SIGXCPU)' },
  152: { signal: 'SIGXFSZ', severity: 'high', reason: 'File size limit exceeded (SIGXFSZ)' },
  153: { signal: 'SIGVTALRM', severity: 'medium', reason: 'Virtual alarm clock (SIGVTALRM)' },
  154: { signal: 'SIGPROF', severity: 'medium', reason: 'Profiling timer alarm (SIGPROF)' },
  155: { signal: 'SIGWINCH', severity: 'low', reason: 'Window size changed (SIGWINCH)' },
  156: { signal: 'SIGIO', severity: 'low', reason: 'I/O now possible (SIGIO)' },
  157: { signal: 'SIGPWR', severity: 'high', reason: 'Power failure (SIGPWR)' },
  158: { signal: 'SIGSYS', severity: 'high', reason: 'Bad system call (SIGSYS)' },
  
  // Application-specific
  255: { signal: 'GENERIC_EXIT', severity: 'high', reason: 'Application exited with error' }
};

export function analyzeExitCode(exitCode) {
  if (exitCode === null || exitCode === undefined) {
    return null;
  }

  // Check exact match first
  if (EXIT_CODE_MAP[exitCode]) {
    return EXIT_CODE_MAP[exitCode];
  }

  // For codes 128+, try to map as signal
  if (exitCode > 128 && exitCode <= 192) {
    const signalNum = exitCode - 128;
    return {
      signal: `SIGNAL_${signalNum}`,
      severity: 'medium',
      reason: `Process killed by signal ${signalNum}`
    };
  }

  // Default for unknown exit codes
  return {
    signal: 'UNKNOWN_ERROR',
    severity: 'medium',
    reason: `Container exited with code ${exitCode}`
  };
}
