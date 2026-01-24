/**
 * Failure Categories
 * ------------------
 * These represent WHAT kind of failure occurred.
 * They are stable, high-level concepts.
 */

export default {
  BUILD: "build", // Image build failures (documented for now)
  CONFIGURATION: "configuration", // Missing env vars, wrong ports, bad secrets
  RUNTIME: "runtime", // App crashes, exceptions
  RESOURCE: "resource", // OOM, CPU starvation
  NETWORK: "network", // Port mismatch, unreachable service
  UNKNOWN: "unknown", // Fallback when signals are unclear
};
