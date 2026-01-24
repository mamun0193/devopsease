import {
  FAILURE_CATEGORIES,
  createFailure,
  FAILURE_STAGES,
} from "../../models/index.js";

/**
 * Classify failure based on collected signals
 */
export function classifyFailure(signals = []) {
  if (!signals.length) {
    return createFailure({
      category: FAILURE_CATEGORIES.UNKNOWN,
      stage: FAILURE_STAGES.UNKNOWN,
      confidence: "low",
      reasons: ["No failure signals detected"],
    });
  }

  // Helper flags
  const hasSignal = (name) => signals.some((s) => s.signal === name);

  const highSeverityCount = signals.filter((s) => s.severity === "high").length;

  /* RESOURCE FAILURE (Highest)  */
  if (hasSignal("OOM_KILLED") || hasSignal("OOM_STATE")) {
    return createFailure({
      category: FAILURE_CATEGORIES.RESOURCE,
      stage: FAILURE_STAGES.RUN,
      confidence: "high",
      reasons: signals.map((s) => s.reason),
      metadata: { signals },
    });
  }

  /* NETWORK FAILURE  */
  if (hasSignal("CONNECTION_REFUSED") || hasSignal("PORT_IN_USE")) {
    return createFailure({
      category: FAILURE_CATEGORIES.NETWORK,
      stage: FAILURE_STAGES.START,
      confidence: highSeverityCount >= 2 ? "high" : "medium",
      reasons: signals.map((s) => s.reason),
      metadata: { signals },
    });
  }

  /* RUNTIME FAILURE */
  if (
    hasSignal("CRASH_LOOP") ||
    hasSignal("NON_ZERO_EXIT") ||
    hasSignal("UNHANDLED_REJECTION")
  ) {
    return createFailure({
      category: FAILURE_CATEGORIES.RUNTIME,
      stage: hasSignal("CRASH_LOOP")
        ? FAILURE_STAGES.RESTART
        : FAILURE_STAGES.RUN,
      confidence: highSeverityCount >= 2 ? "high" : "medium",
      reasons: signals.map((s) => s.reason),
      metadata: { signals },
    });
  }

  /* CONFIGURATION FAILURE */
  if (hasSignal("MODULE_NOT_FOUND")) {
    return createFailure({
      category: FAILURE_CATEGORIES.CONFIGURATION,
      stage: FAILURE_STAGES.START,
      confidence: "high",
      reasons: signals.map((s) => s.reason),
      metadata: { signals },
    });
  }

  /* FALLBACK  */
  return createFailure({
    category: FAILURE_CATEGORIES.UNKNOWN,
    stage: FAILURE_STAGES.UNKNOWN,
    confidence: "low",
    reasons: signals.map((s) => s.reason),
    metadata: { signals },
  });
}
