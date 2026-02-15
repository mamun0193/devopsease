// Calculate Mean Time Between Failures (MTBF)

function calculateMTBF(startedAt, restartCount) {
  if (!startedAt || restartCount === 0) return null;

  const startTime = new Date(startedAt).getTime();
  const now = Date.now();
  
  if (isNaN(startTime)) return null;

  const uptimeSeconds = Math.max(0, (now - startTime) / 1000);

  // If restarts > 0, MTBF = uptime / restarts
  // We use max(1, restartCount) to avoid division by zero, though the if-check handles 0.
  const mtbf = uptimeSeconds / restartCount;

  return Math.floor(mtbf);
}

// Calculate Restart Density Score
// Detects rapid restart patterns.

function calculateRestartDensity(restartCount, uptimeSeconds) {
  // If uptime is very short (< 5 mins) and we have restarts
  if (uptimeSeconds < 300 && restartCount >= 3) {
    // High density: cap at 1.0. 
    // Example: 3 restarts = 0.6, 5 restarts = 1.0
    return Math.min(1.0, restartCount / 5);
  }
  
  // Linear decay for normal operation
  // 10 restarts = 1.0, 1 restart = 0.1
  return Math.min(1.0, restartCount * 0.1);
}

// Calculate Instability Factors
// Extracts raw metrics for scoring.

function calculateInstabilityFactors(containerState, classification) {
  const restartCount = containerState.RestartCount || 0;
  const startedAt = containerState.StartedAt;
  const startTime = new Date(startedAt).getTime();
  const now = Date.now();
  const uptimeSeconds = !isNaN(startTime) ? Math.max(0, (now - startTime) / 1000) : 0;

  const mtbfSeconds = calculateMTBF(startedAt, restartCount);

  // 1. Crash Loop Factor
  // Leverages existing classifier or raw heuristics
  const isCrashLoop = classification?.type === 'CRASH_LOOP';
  
  // 2. Restart Density
  const restartDensityScore = calculateRestartDensity(restartCount, uptimeSeconds);
  
  // 3. MTBF Score (Lower MTBF = Higher Score)
  // < 1 min = 1.0, < 5 min = 0.8, < 1 hr = 0.5, > 1 day = 0.0
  let mtbfScore = 0;
  if (mtbfSeconds !== null) {
      if (mtbfSeconds < 60) mtbfScore = 1.0;
      else if (mtbfSeconds < 300) mtbfScore = 0.8;
      else if (mtbfSeconds < 3600) mtbfScore = 0.5;
      else if (mtbfSeconds < 86400) mtbfScore = 0.2;
      else mtbfScore = 0.0;
  }

  // 4. Severity Score
  // OOM / Port Conflict = High Severity
  let severityScore = 0;
  if (classification?.type === 'RESOURCE_EXHAUSTION') severityScore = 0.9;
  if (classification?.type === 'PORT_CONFLICT') severityScore = 1.0;
  if (classification?.type === 'CONFIG_ERROR') severityScore = 0.7;

  return {
    isCrashLoop,
    restartDensityScore,
    mtbfScore,
    severityScore,
    mtbfSeconds,
    restartCount // Passed through for context
  };
}

// Compute Final Instability Score
// Weighted sum of factors.

function calculateInstabilityScore(factors) {
  let score = 0;

  // Weights
  // Crash loop is the strongest signal
  if (factors.isCrashLoop) score += 0.4;
  
  score += factors.restartDensityScore * 0.3;
  score += factors.mtbfScore * 0.2;
  score += factors.severityScore * 0.1;

  // Clamp
  return Math.min(1.0, Math.max(0.0, score));
}

export function analyzeInstability(containerState, restartCount, classificationResult) {
  // Defensive copy/merge since restartCount might be top-level or in state
  const state = { ...containerState, RestartCount: restartCount };
  
  const factors = calculateInstabilityFactors(state, classificationResult);
  const instabilityScore = calculateInstabilityScore(factors);

  const isUnstable = instabilityScore >= 0.7;

  return {
    instabilityScore,
    isUnstable,
    mtbfSeconds: factors.mtbfSeconds,
    factors // Optional: exposing internal factors for debug/evidence if needed later
  };
}
