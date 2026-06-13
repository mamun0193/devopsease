# Day 92 — Pipeline Reliability & Execution History

## Overview

A major backend architectural shift focused on CI/CD pipeline reliability, execution history, and scalable webhook processing. No new end-user features were added; the goal was to make pipelines traceable, auditable, and resilient.

---

## 1. PipelineRun Model (Execution History)

Previously, execution history was stored directly on the `Pipeline` document, meaning each new run overwrote previous execution data.

**Changes:**
- **`pipelineRun.model.js` — NEW**
  - Acts as a permanent audit trail (no TTL).
  - Captures `triggerSource`, `commitHash`, `commitMessage`, and `author` from incoming webhooks.
  - Granular step tracking: `steps: [{ name, status, startedAt, completedAt, duration }]`.
  - Maintains `logPath`, `logSize`, `logSummary`, and `lastLogAt` for filesystem integration.

---

## 2. Filesystem Logs & APIs

Following the strategy from Day 91 for build logs, pipeline logs are now streamed directly to the filesystem to protect MongoDB from large document explosions.

**`pipelineLog.service.js` — NEW**
- Uses Node.js `WriteStream` to stream logs directly to `storage/pipeline-runs/<runId>.log`.
- Only a capped summary is kept in MongoDB for quick dashboard previews.

**New Endpoints:**
- `GET /pipelines/:id/runs` — Paginated list of historical runs for a pipeline.
- `GET /pipeline-runs/:id` — Details for a specific run.
- `GET /pipeline-runs/:id/logs` — Streams the log file directly to the client with zero memory overhead.

---

## 3. Distributed Webhook Deduplication

Previously, GitHub delivery ID tracking was strictly in-memory, making it vulnerable to process restarts and multi-instance scaling issues.

**`webhookDedup.service.js` — NEW**
- Uses Redis `SET NX EX` for atomic, cross-instance check-and-set deduplication.
- Webhook keys (`webhook:delivery:<id>`) auto-expire after 24 hours.
- **Graceful degradation:** Transparently falls back to the legacy in-memory `Set` if Redis is unavailable, ensuring no webhooks are lost during transient cache outages.

---

## 4. Real Test Step Execution

The `test` step in the pipeline config is no longer a placeholder.

**Changes in `pipeline.service.js`:**
- Uses `projectDetector.service.js` to determine project type.
- Spawns real OS processes via `child_process.spawn` inside the workspace (`npm test` for Node, `pytest` for Python).
- Captures `stdout` and `stderr` line-by-line and pipes it into the pipeline run log.
- **Safeguards:** Implemented a strict **5-minute execution timeout** and a **10MB output size limit** to protect the host server from runaway tests.

---

## 5. Execution Metrics API

**Changes in `pipeline.service.js`:**
- Added a fast, single-pass MongoDB `$group` aggregation to calculate pipeline health.
- `GET /pipelines/:id/metrics` returns:
  - Total runs
  - Successful / Failed run counts
  - Average execution duration
  - Last run timestamp and status

---

## Files Modified

| File | Change |
|------|--------|
| `server/src/models/pipelineRun.model.js` | **NEW** — Execution history model |
| `server/src/services/pipelineLog.service.js` | **NEW** — Filesystem log manager |
| `server/src/services/webhookDedup.service.js` | **NEW** — Redis-backed dedup |
| `server/src/routes/pipelineRun.routes.js` | **NEW** — Execution API routes |
| `server/src/services/pipeline.service.js` | Completely rewrote `executePipeline` and test execution logic |
| `server/src/controllers/pipeline.controller.js` | Added history, streaming log, and metrics endpoints |
| `server/src/controllers/webhook.controller.js` | Integrated Redis dedup, pass commit metadata |
| `server/src/routes/pipeline.routes.js` | Added `/runs` and `/metrics` routes |
| `server/src/index.js` | Mounted `/api/pipeline-runs` |

---

## ✅ Outcome

→ **Auditability:** Complete, permanent CI/CD history is now tracked per repository.  
→ **Traceability:** Every run is tied to the exact Git commit, message, and author.  
→ **Resilience:** Server is protected from memory bloat (logs on disk) and runaway tests (timeouts/size limits).  
→ **Scalability:** Webhook deduplication scales cleanly across multiple instances.  

## What's Next

📅 **Day 93**
- Connect the frontend dashboard to display historical pipeline runs and execution metrics.
- Build the real-time pipeline log viewer UI.
