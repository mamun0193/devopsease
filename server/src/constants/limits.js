// Operational limits and timeout constants.
// All tunable thresholds live here so they can be changed in one place.

//  Pipeline 
export const MAX_PIPELINE_YAML_SIZE = 10_000;
export const MAX_PIPELINE_STEPS = 20;
export const MAX_STEP_NAME_LENGTH = 64;
export const PIPELINE_STALE_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes
export const MAX_PIPELINE_LOG_BUFFER = 500;
export const TEST_STEP_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
export const MAX_TEST_OUTPUT_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_PIPELINE_NAME_LENGTH = 128;

//  Deployments 
export const MAX_REPLICAS = 5;
export const ROLLBACK_LOOKBACK_LIMIT = 10;
export const MAX_ROLLBACK_REASON_LENGTH = 500;
export const PORT_MIN = 3000;
export const PORT_MAX = 9999;
export const PORT_COLLISION_MAX_RETRIES = 3;

//  Builds 
export const BUILD_STALE_THRESHOLD_MS = 60 * 60 * 1000; // 1 hour

//  Containers 
export const DEFAULT_CPU_LIMIT = 0.5;
export const DEFAULT_MEMORY_LIMIT_MB = 128;
export const MIN_MEMORY_LIMIT_MB = 4;

//  Webhooks 
export const WEBHOOK_DEDUP_TTL_SECONDS = 300; // 5 minutes

//  API 
export const DEFAULT_PAGE_LIMIT = 100;
