/**
 * Failure Stages
 * --------------
 * These represent WHEN in the container lifecycle the failure happened.
 */

export default {
  CREATE: 'create',       // Container created but not started
  START: 'start',         // Failed during startup
  RUN: 'run',             // Failed after running
  RESTART: 'restart',     // Crash loop / restarting
  EXIT: 'exit',           // Exited unexpectedly
  UNKNOWN: 'unknown'
};
