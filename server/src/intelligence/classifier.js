import {
  FAILURE_CATEGORIES,
  createFailure,
  FAILURE_STAGES,
} from "../../models/index.js";

export const FAILURE_TYPES = Object.freeze({
  CONFIG_ERROR: "CONFIG_ERROR",
  RESOURCE_EXHAUSTION: "RESOURCE_EXHAUSTION",
  PORT_CONFLICT: "PORT_CONFLICT",
  PERMISSION_ERROR: "PERMISSION_ERROR",
  CRASH_LOOP: "CRASH_LOOP",
  GRACEFUL_STOP: "GRACEFUL_STOP",
  HEALTHY: "HEALTHY",
  PENDING: "PENDING",
  PAUSED: "PAUSED",
  UNKNOWN: "UNKNOWN",
});

const LOG_PATTERNS = {
  oom: [/OOMKilled/i, /Killed process/i, /out of memory/i],
  portConflict: [/address already in use/i, /EADDRINUSE/i, /bind:\s*address already in use/i],
  permission: [/permission denied/i, /EACCES/i, /operation not permitted/i],
  config: [/invalid configuration/i, /missing environment variable/i, /syntax error/i, /unexpected token/i],
};

function findLogMatches(logs, patterns) {
  const evidence = [];
  for (const pattern of patterns) {
    const match = logs.match(pattern);
    if (match) {
      evidence.push(match[0]);
    }
  }
  return evidence;
}

function detectCrashLoop(signals, state, restartCount, exitCode) {
  if (restartCount >= 3 && exitCode !== 0) {
    const confidence = restartCount >= 5 ? 0.95 : 0.85;
    return {
      type: FAILURE_TYPES.CRASH_LOOP,
      confidenceScore: confidence,
      summary: `Container is in a crash loop with ${restartCount} restarts and exit code ${exitCode}`,
      evidence: [`RestartCount: ${restartCount}`, `ExitCode: ${exitCode}`],
    };
  }
  return null;
}

function detectResourceExhaustion(signals, state, exitCode, logs) {
  const evidence = [];

  if (exitCode === 137) {
    evidence.push("ExitCode 137 (SIGKILL — likely OOM)");
  }

  if (state?.OOMKilled) {
    evidence.push("Docker OOMKilled flag is true");
  }

  const logEvidence = findLogMatches(logs, LOG_PATTERNS.oom);
  evidence.push(...logEvidence);

  if (evidence.length === 0) return null;

  const hasExitCodeMatch = exitCode === 137 || state?.OOMKilled;
  return {
    type: FAILURE_TYPES.RESOURCE_EXHAUSTION,
    confidenceScore: hasExitCodeMatch ? 0.9 : 0.75,
    summary: "Container terminated due to resource exhaustion (out of memory)",
    evidence,
  };
}

function detectPortConflict(logs) {
  const evidence = findLogMatches(logs, LOG_PATTERNS.portConflict);
  if (evidence.length === 0) return null;

  return {
    type: FAILURE_TYPES.PORT_CONFLICT,
    confidenceScore: evidence.length >= 2 ? 0.9 : 0.75,
    summary: "Container failed to bind to a port — address already in use",
    evidence,
  };
}

function detectPermissionError(logs) {
  const evidence = findLogMatches(logs, LOG_PATTERNS.permission);
  if (evidence.length === 0) return null;

  return {
    type: FAILURE_TYPES.PERMISSION_ERROR,
    confidenceScore: 0.85,
    summary: "Container encountered a permission or access error",
    evidence,
  };
}

function detectConfigError(logs) {
  const evidence = findLogMatches(logs, LOG_PATTERNS.config);
  if (evidence.length === 0) return null;

  return {
    type: FAILURE_TYPES.CONFIG_ERROR,
    confidenceScore: evidence.length >= 2 ? 0.8 : 0.7,
    summary: "Container failed due to invalid or missing configuration",
    evidence,
  };
}

function detectUnknown(exitCode) {
  return {
    type: FAILURE_TYPES.UNKNOWN,
    confidenceScore: 0.4,
    summary: "Failure detected but root cause is unclear",
    evidence: exitCode !== 0 && exitCode !== undefined
      ? [`ExitCode: ${exitCode}`]
      : [],
  };
}

function detectHealthy(state, exitCode) {
  if (state?.Running && !state?.Restarting && !state?.Paused) {
    return {
      type: FAILURE_TYPES.HEALTHY,
      confidenceScore: 1.0,
      summary: "Container is operating normally",
      evidence: [],
    };
  }
  return null;
}

function detectGracefulStop(state, exitCode, restartCount) {
  const isExited = state?.Status === 'exited' || !state?.Running;
  const isCleanExit = exitCode === 0 || exitCode === 143;
  // Ignore restartCount history — only check if it's currently restarting
  const isRestarting = state?.Restarting;

  if (isExited && isCleanExit && !isRestarting && state?.Status !== 'created') {
    return {
      type: FAILURE_TYPES.GRACEFUL_STOP,
      confidenceScore: 1.0,
      summary: exitCode === 0
        ? "Container was stopped gracefully — no failure detected"
        : "Container received SIGTERM and exited — likely stopped by owner",
      evidence: [`ExitCode: ${exitCode}`, `State: ${state?.Status || 'exited'}`],
    };
  }
  return null;
}

function detectPending(state) {
  // Catch 'created' or 'restarting' states that aren't crash loops
  if (state?.Status === 'created' || state?.Restarting || state?.Status === 'restarting') {
    return {
      type: FAILURE_TYPES.PENDING,
      confidenceScore: 1.0,
      summary: "Container is starting up or restarting",
      evidence: [`State: ${state?.Status}`, `Restarting: ${state?.Restarting}`],
    };
  }
  return null;
}

function detectPaused(state) {
  if (state?.Paused || state?.Status === 'paused') {
    return {
      type: FAILURE_TYPES.PAUSED,
      confidenceScore: 1.0,
      summary: "Container is paused",
      evidence: [`State: ${state?.Status}`],
    };
  }
  return null;
}

export function classifyFailure(signals = [], { state, exitCode, restartCount, logs = "" } = {}) {
  const detectors = [
    () => detectHealthy(state, exitCode),
    () => detectPaused(state),
    () => detectGracefulStop(state, exitCode, restartCount),
    () => detectCrashLoop(signals, state, restartCount, exitCode),
    () => detectPending(state), // Handles restart/created if not crash loop
    () => detectResourceExhaustion(signals, state, exitCode, logs),
    () => detectPortConflict(logs),
    () => detectPermissionError(logs),
    () => detectConfigError(logs),
  ];

  for (const detect of detectors) {
    const result = detect();
    if (result) return result;
  }

  return detectUnknown(exitCode);
}
