# Day 86 — CI/CD Pipeline Execution Engine (Sequential Run + Status Tracking)

## Overview

Extended Day 85 from pipeline definition to actual execution.
Pipelines now run configured steps (`build`, `test`, `deploy`) sequentially with stop-on-failure behavior.
Execution status, logs, and timestamps are persisted.
GitHub push webhook now triggers active pipelines automatically.

---

## Backend

### `pipeline.model.js` — MODIFIED

Added execution tracking fields:

| Field | Type | Description |
|-------|------|-------------|
| executionStatus | String | `pending` / `running` / `success` / `failed` |
| executionLogs | Array | Step logs (`step`, `message`, `timestamp`) |
| startedAt | Date | Run start time |
| completedAt | Date | Run completion time |

`status` (`active` / `inactive` / `error`) remains as pipeline definition state.

### `pipeline.service.js` — MODIFIED

Added `executePipeline(pipelineId)`:
- fetch pipeline
- set `executionStatus = running`
- run steps in order from `config.steps`
- log each step start/success/failure
- stop immediately on failure
- mark final status `success` or `failed`

Added internal handlers:
- `runBuildStep(repoId)` → clone + build
- `runTestStep(repoId)` → placeholder pass
- `runDeployStep(repoId)` → deploy latest successful build

Added helpers:
- `getPipelineExecutionStatus(pipelineId, userId)`
- `getActivePipelinesByRepo(repoId)`

### `pipeline.controller.js` / `pipeline.routes.js` — MODIFIED

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/pipelines/:id/run` | Execute pipeline |
| GET | `/api/pipelines/:id/status` | Get status + logs |

### `webhook.controller.js` — MODIFIED

On GitHub `push`:
- find active pipelines for repo
- execute each pipeline sequentially
- log per-pipeline failures without breaking webhook response

---

## Execution Flow

```yaml
steps:
  - build
  - test
  - deploy
```

1. mark run as `running`
2. execute steps in order
3. on failure: mark `failed`, log error, stop
4. on success: mark `success`, set completion time

---

## Error Handling

| Scenario | Result |
|----------|--------|
| Pipeline not found | `404 Pipeline not found` |
| Any step fails | Run stops and status becomes `failed` |
| Webhook executes multiple pipelines and one fails | Failure logged, flow continues |

---

## ✅ Outcome

→ Pipelines execute dynamically from stored config  
→ Steps run strictly in sequence  
→ Fail-fast behavior works per step  
→ Execution logs and timestamps are saved  
→ Push events now trigger pipeline execution automatically