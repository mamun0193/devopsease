import { FAILURE_CATEGORIES, FAILURE_STAGES } from "../../models/index.js";
/**
 * Convert a classified failure into a human-readable explanation
 */
export function explainFailure(failure) {
  const { category, stage, confidence, reasons } = failure;

  switch (category) {
    case FAILURE_CATEGORIES.RESOURCE:
      return explainResourceFailure(stage, confidence, reasons);

    case FAILURE_CATEGORIES.NETWORK:
      return explainNetworkFailure(stage, confidence, reasons);

    case FAILURE_CATEGORIES.RUNTIME:
      return explainRuntimeFailure(stage, confidence, reasons);

    case FAILURE_CATEGORIES.CONFIGURATION:
      return explainConfigFailure(stage, confidence, reasons);

    default:
      return explainUnknownFailure();
  }
}

/*  RESOURCE FAILURE */
function explainResourceFailure(stage, confidence, reasons) {
  return {
    summary: "Container ran out of system resources",
    confidence,
    explanation: `
The container was terminated because it exceeded available system resources.
This usually happens when the application consumes more memory or CPU than Docker allows.
    `.trim(),
    likelyCauses: [
      "Memory leak in the application",
      "Insufficient memory limit for the container",
      "Unexpected traffic spike or heavy workload",
    ],
    suggestedChecks: [
      "Check container memory usage",
      "Review memory limits in Docker configuration",
      "Inspect application logs for excessive memory allocation",
    ],
    signalsObserved: reasons,
  };
}

/* 
   NETWORK FAILURE
*/
function explainNetworkFailure(stage, confidence, reasons) {
  return {
    summary: "Container could not reach a required service",
    confidence,
    explanation: `
The application inside the container failed to connect to another service.
This often means a dependency is not running, not reachable, or misconfigured.
    `.trim(),
    likelyCauses: [
      "Dependent service is not running",
      "Incorrect host or port configuration",
      "Network or port mismatch in Docker setup",
    ],
    suggestedChecks: [
      "Verify dependent services are running",
      "Check environment variables for host and port",
      "Confirm exposed and listening ports",
    ],
    signalsObserved: reasons,
  };
}

/* 
   RUNTIME FAILURE
*/
function explainRuntimeFailure(stage, confidence, reasons) {
  return {
    summary: "Application crashed during execution",
    confidence,
    explanation: `
The application started but crashed while running.
This usually indicates an unhandled error or unexpected runtime condition.
    `.trim(),
    likelyCauses: [
      "Unhandled exception in application code",
      "Invalid runtime configuration",
      "Unexpected input or data format",
    ],
    suggestedChecks: [
      "Review recent application logs",
      "Check for unhandled exceptions",
      "Validate runtime configuration values",
    ],
    signalsObserved: reasons,
  };
}

/* CONFIGURATION FAILURE  */
function explainConfigFailure(stage, confidence, reasons) {
  return {
    summary: "Application configuration is invalid or incomplete",
    confidence,
    explanation: `
The application failed to start due to missing or incorrect configuration.
This usually happens when required environment variables or files are not provided.
    `.trim(),
    likelyCauses: [
      "Missing environment variables",
      "Incorrect configuration values",
      "Required files not included in the image",
    ],
    suggestedChecks: [
      "Verify all required environment variables are set",
      "Check configuration file paths",
      "Review startup logs for missing values",
    ],
    signalsObserved: reasons,
  };
}

/*  UNKNOWN FAILURE  */
function explainUnknownFailure() {
  return {
    summary: "Failure detected but cause is unclear",
    confidence: "low",
    explanation: `
A failure was detected, but there is not enough information to determine the exact cause.
    `.trim(),
    likelyCauses: [
      "Insufficient logs or signals",
      "Unexpected container behavior",
    ],
    suggestedChecks: [
      "Review full container logs",
      "Inspect container state manually",
    ],
    signalsObserved: [],
  };
}
