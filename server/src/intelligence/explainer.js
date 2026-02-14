import { FAILURE_TYPES } from "./classifier.js";

export function explainFailure(failure) {
  const { category, confidence, reasons = [] } = failure;

  switch (category) {
    case FAILURE_TYPES.GRACEFUL_STOP:
      return buildExplanation({
        summary: "Container was stopped gracefully",
        confidence,
        explanation: "The container exited cleanly, likely stopped by the owner or an orchestration system. No failure occurred.",
        likelyCauses: [],
        suggestedChecks: [],
        signalsObserved: reasons,
      });

    case FAILURE_TYPES.HEALTHY:
      return buildExplanation({
        summary: "Container is operating normally",
        confidence,
        explanation: "The container is running and has not exhibited any signs of failure.",
        likelyCauses: [],
        suggestedChecks: [],
        signalsObserved: [],
      });

    case FAILURE_TYPES.PENDING:
      return buildExplanation({
        summary: "Container is starting or restarting",
        confidence,
        explanation: "The container is currently in a transitional state (created or restarting). This is normal during startup or manual restarts.",
        likelyCauses: [],
        suggestedChecks: ["Wait for the container to become fully healthy"],
        signalsObserved: reasons,
      });

    case FAILURE_TYPES.PAUSED:
      return buildExplanation({
        summary: "Container is paused",
        confidence,
        explanation: "The container has been manually paused by a user.",
        likelyCauses: [],
        suggestedChecks: ["Unpause the container to resume operations"],
        signalsObserved: reasons,
      });

    case FAILURE_TYPES.RESOURCE_EXHAUSTION:
      return buildExplanation({
        summary: "Container ran out of system resources",
        confidence,
        explanation: "The container was terminated because it exceeded available system resources. This usually happens when the application consumes more memory than Docker allows.",
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
      });

    case FAILURE_TYPES.PORT_CONFLICT:
      return buildExplanation({
        summary: "Container could not bind to a required port",
        confidence,
        explanation: "The application failed to start because a port it needs is already in use by another process or container.",
        likelyCauses: [
          "Another container using the same host port",
          "Host service occupying the port",
          "Stale container not properly cleaned up",
        ],
        suggestedChecks: [
          "Check which process is using the port",
          "Review port mappings for conflicts",
          "Stop conflicting containers or services",
        ],
        signalsObserved: reasons,
      });

    case FAILURE_TYPES.CRASH_LOOP:
      return buildExplanation({
        summary: "Container is stuck in a crash loop",
        confidence,
        explanation: "The container keeps crashing and restarting repeatedly, indicating a persistent failure that prevents stable operation.",
        likelyCauses: [
          "Unhandled exception in application startup",
          "Missing dependency or configuration",
          "Resource constraints causing repeated OOM kills",
        ],
        suggestedChecks: [
          "Review recent application logs for the crash reason",
          "Check entry point and startup command",
          "Verify all dependencies are available",
        ],
        signalsObserved: reasons,
      });

    case FAILURE_TYPES.PERMISSION_ERROR:
      return buildExplanation({
        summary: "Container encountered a permission error",
        confidence,
        explanation: "The application was denied access to a file, directory, or system resource. This often occurs when running as a non-root user without sufficient permissions.",
        likelyCauses: [
          "File or directory owned by a different user",
          "Read-only filesystem or volume",
          "Security policy blocking the operation",
        ],
        suggestedChecks: [
          "Check file permissions inside the container",
          "Verify volume mount permissions",
          "Review container security context",
        ],
        signalsObserved: reasons,
      });

    case FAILURE_TYPES.CONFIG_ERROR:
      return buildExplanation({
        summary: "Application configuration is invalid or incomplete",
        confidence,
        explanation: "The application failed due to missing or incorrect configuration. This usually happens when required environment variables or config files are not provided.",
        likelyCauses: [
          "Missing environment variables",
          "Incorrect configuration values",
          "Syntax error in configuration files",
        ],
        suggestedChecks: [
          "Verify all required environment variables are set",
          "Check configuration file syntax",
          "Review startup logs for missing values",
        ],
        signalsObserved: reasons,
      });

    default:
      return buildExplanation({
        summary: "Failure detected but cause is unclear",
        confidence: 0.4,
        explanation: "A failure was detected, but there is not enough information to determine the exact cause.",
        likelyCauses: [
          "Insufficient logs or signals",
          "Unexpected container behavior",
        ],
        suggestedChecks: [
          "Review full container logs",
          "Inspect container state manually",
        ],
        signalsObserved: [],
      });
  }
}

function buildExplanation({ summary, confidence, explanation, likelyCauses, suggestedChecks, signalsObserved }) {
  return {
    summary,
    confidence,
    explanation,
    likelyCauses,
    suggestedChecks,
    signalsObserved,
  };
}
