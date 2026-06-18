// Status constants for all domain models.
// Centralizes status strings to prevent typos and enable grep-ability.

//  Build Statuses 
export const BUILD_STATUS = Object.freeze({
    PENDING:   'pending',
    RUNNING:   'running',
    SUCCESS:   'success',
    FAILED:    'failed',
    CANCELLED: 'cancelled',
});

export const BUILD_TERMINAL_STATUSES = [BUILD_STATUS.SUCCESS, BUILD_STATUS.FAILED, BUILD_STATUS.CANCELLED];
export const BUILD_ACTIVE_STATUSES = [BUILD_STATUS.PENDING, BUILD_STATUS.RUNNING];

// Deployment Statuses 
export const DEPLOYMENT_STATUS = Object.freeze({
    PENDING:   'pending',
    DEPLOYING: 'deploying',
    RUNNING:   'running',
    STOPPED:   'stopped',
    FAILED:    'failed',
    REMOVED:   'removed',
});

export const DEPLOYMENT_ROLLBACK_ELIGIBLE = [DEPLOYMENT_STATUS.RUNNING, DEPLOYMENT_STATUS.STOPPED];

//  Pipeline Statuses 
export const PIPELINE_STATUS = Object.freeze({
    ACTIVE:   'active',
    INACTIVE: 'inactive',
    ERROR:    'error',
});

export const PIPELINE_RUN_STATUS = Object.freeze({
    PENDING: 'pending',
    RUNNING: 'running',
    SUCCESS: 'success',
    FAILED:  'failed',
});

export const PIPELINE_RUN_ACTIVE_STATUSES = [PIPELINE_RUN_STATUS.PENDING, PIPELINE_RUN_STATUS.RUNNING];

// Container Statuses 
export const CONTAINER_STATUS = Object.freeze({
    RUNNING: 'running',
    STOPPED: 'stopped',
    PAUSED:  'paused',
    CREATED: 'created',
    EXITED:  'exited',
});
