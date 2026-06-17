# DAY 94: Production Hardening Sprint — Security, Reliability & Pipeline Correctness

## Overview
Day 94 was a dedicated backend hardening session with zero new user-facing features. The goal was to address every security, reliability, and correctness issue identified during an engineering audit of the CI/CD and deployment subsystems. 14 existing files were modified and 1 new migration script was added across a 10-task sprint followed by 3 targeted correctness follow-ups.

---

## 1. Concurrent Pipeline Guard (T1)

**Problem:** The same pipeline could be triggered multiple times simultaneously, causing multiple Docker builds, duplicate deployments, and CPU/RAM waste.

**Fix (Two-layer defence):**
- Added a **unique partial index** on the `PipelineRun` collection: `{ pipelineId: 1 }` where `status ∈ ['pending', 'running']`. This is the true enforcement layer — MongoDB rejects duplicate inserts at the database level even under race conditions (TOCTOU).
- Added a **pre-check** `findOne()` that returns a user-friendly `409 Conflict` before the insert is attempted.
- Added **stale run recovery**: any run stuck in `pending/running` for more than 30 minutes is automatically failed before the check runs, preventing permanent lockout after server crashes.

---

## 2. Rate Limiting on Critical Routes (T2)

Applied the existing `rateLimiter(actionType)` middleware to 8 previously unprotected routes:

| Route | Action Type |
|---|---|
| `POST /api/pipelines/` | `create` |
| `POST /api/pipelines/:id/run` | `exec` |
| `DELETE /api/pipelines/:id` | `destructive` |
| `POST /api/deployments/:id/stop` | `destructive` |
| `POST /api/deployments/:id/remove` | `destructive` |
| `POST /api/deployments/:id/rollback` | `destructive` |
| `POST /api/deployments/:id/scale` | `exec` |
| `POST /api/builds/` | `create` |

Rate limit headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`) are now returned on all protected responses.

---

## 3. Deployment Ownership (`userId`) (T3)

**Problem:** Deployments had no direct `userId` field. Ownership checks required a 3-query chain (`Deployment → Repository → User`), which was both slow and fragile.

**Fix:**
- Added `userId` field to the `Deployment` schema (`default: null`, indexed).
- `deployFromBuild()` and `rollbackDeployment()` now resolve and persist `userId` on every new Deployment record.
- `assertDeploymentOwnership()` uses a fast direct `userId` comparison for post-migration documents and falls back to the legacy repo-based lookup for old records.
- Created `src/scripts/migrate-deployment-userId.js` — an idempotent one-shot script that backfills `userId` on all existing deployments by resolving through their `Repository`. Handles orphaned deployments (deleted repos) gracefully.

---

## 4. Pipeline Configuration Validation (T4 + T3 follow-up)

`validatePipelineConfig()` now enforces a full set of structural rules:

| Rule | Constraint |
|---|---|
| YAML size | Max 10,000 characters (before parsing) |
| Max steps | 20 |
| Step name type | Must be non-empty string |
| Step name length | Max 64 characters |
| Allowed step names | `build`, `test`, `deploy` only |
| Duplicate steps | Rejected |
| `deploy` without `build` | Rejected |
| `deploy` before `build` | Rejected |
| `test` before `build` | Rejected |
| Prototype pollution | Stripped via `JSON.parse(JSON.stringify(parsed))` |

The `rawYaml` field on the Pipeline model also gained a `maxlength: 10000` constraint as defence-in-depth at the persistence layer.

---

## 5. Pipeline Name Sanitization (T5)

Pipeline names are now sanitized before storage:
- Strips HTML/XSS chars: `< > " ' &`
- Strips control characters: `\x00–\x1F`, `\x7F`
- Trims whitespace from both ends
- Truncates to 128 characters
- Rejects empty names (after sanitization) with `400`

---

## 6. Secure Log Streaming — Path Traversal Prevention (T6)

**Problem:** `createLogReadStream()` and `readLogFile()` in both log services accepted any `logPath` from the database without validation. A compromised document could point to an arbitrary file on the server.

**Fix:** Both functions in `pipelineLog.service.js` and `buildLog.service.js` now resolve the requested path and verify it starts with the service's own `STORAGE_DIR` before opening the file. Invalid paths return `null`/empty string and log a warning. Controllers already handle `null` returns gracefully — no controller changes required.

---

## 7. Branch-aware Pipeline Execution with Wildcard Support (T7 + follow-up)

**Initial fix:** Webhook pipeline triggers now filter by `pipeline.config.branch` or `pipeline.config.targetBranch`. Pipelines without a configured branch continue to trigger on all pushes.

**Follow-up:** Upgraded from exact matching to **glob wildcard matching** via a `branchMatches()` helper. Converts `*` to `.*` (with proper regex escaping) for patterns like `feature/*`, `release/*`, `hotfix/*`. Both sides are normalized via the existing `normalizeBranch()` to handle the `refs/heads/` prefix.

| Pattern | Example Branch | Result |
|---|---|---|
| `main` | `main` | ✅ Triggers |
| `feature/*` | `feature/login` | ✅ Triggers |
| `feature/*` | `main` | ❌ Skipped |
| `release/*` | `release/v2.0` | ✅ Triggers |
| *(not set)* | any | ✅ Always triggers |

---

## 8. Secure Test Runner — Env Var Isolation (T8)

**Problem:** `runTestStep()` inherited the full `process.env` in its `spawn()` call, leaking `JWT_SECRET`, `MONGO_URI`, `GITHUB_CLIENT_SECRET`, and all other server secrets to untrusted test processes.

**Fix:** The test process now receives only a minimal, curated environment:
```
PATH, HOME, CI=true, NODE_ENV=test
```
Plus `SYSTEMROOT` and `COMSPEC` conditionally on Windows (required for `shell: true` to locate `cmd.exe`).

---

## 9. Rollback Improvement (T9)

`rollbackDeployment()` now includes `stopped` deployments as rollback candidates in addition to `running` ones. Previously, if the target deployment was stopped but its Docker image still existed, rollback would fail with "no previous deployment found". The failure case (image already pruned) is already handled by the existing try/catch, which marks the rollback as `failed`.

---

## 10. Port Allocation Retry (T10)

**Problem:** Concurrent `deployFromBuild()` calls could query the same set of used ports, both select the same "free" port, and collide at the Docker level.

**Fix:** `createReplica()` now has an outer retry loop (up to 3 attempts) that specifically detects Docker port-collision errors (`port is already allocated`, `address already in use`) and re-allocates a fresh port before retrying. The existing random allocation strategy is preserved; a new port is only reallocated when Docker explicitly reports a conflict.

---

## 11. Deploy the Correct Build (Follow-up)

**Problem:** The pipeline deploy step called `runDeployStep(repoId)` which queried `Build.findOne({ repoId, status: 'success' }).sort({ createdAt: -1 })` — the most recent successful build for the repository. If two pipelines ran concurrently, Pipeline A could end up deploying Pipeline B's build.

**Fix:** `runDeployStep()` now accepts an explicit `buildId`. During execution, the build step stores its result as `run.buildId`; the deploy step reads `run.buildId` and deploys exactly that build. Added validation: rejects if `buildId` is missing, if the build doesn't exist, or if the build status is not `success`.

---

## Breaking Changes

**None.** All changes are backward compatible. Existing API contracts, response shapes, and database documents are unaffected. The migration script must be run post-deployment to backfill `userId` on existing deployment records.
