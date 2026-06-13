# Day 91 — Stabilization Sprint: Data Integrity & Storage Scalability

## Overview

Focused refactor session targeting production readiness — no new features.
Three core problems identified during the Day 90 audit were resolved:
inconsistent build status enumerations causing query failures,
MongoDB document growth from build log arrays threatening the 16 MB document limit,
and missing/undersized TTL indexes on high-volume collections.

---

## Task 1 — Build Status Enum Normalization

### Problem

The `Build` model carried a mixed-case enum:

```js
['PENDING', 'RUNNING', 'SUCCESS', 'FAILED', 'TIMEOUT', 'pending', 'running', 'success', 'failed']
```

`BuildService._executeBuild` wrote uppercase values; `runBuildPipeline` wrote lowercase.
`pipeline.service.js` contained an explicit workaround `['success', 'SUCCESS']` acknowledging the inconsistency.
The dashboard `STATUS_CONFIG` keyed on uppercase — uppercase values displayed correctly, lowercase showed unstyled.
The CLI `statusColor` mapped only lowercase — uppercase statuses rendered as plain white text.

### Changes

**`build.model.js`**
- Enum changed to `['pending', 'running', 'success', 'failed', 'cancelled', 'timeout']`
- Default changed from `'PENDING'` → `'pending'`
- `cancelled` added to enum for future cancellation support

**`build.service.js`**
- 12 status string literals normalized to lowercase across `startBuild`, `_executeBuild`, and `recoverStaleBuilds`
- `$in: ['PENDING', 'RUNNING']` queries updated in concurrent build check and stale build recovery

**`pipeline.service.js`**
- `SUCCESS_BUILD_STATUSES` simplified from `['success', 'SUCCESS']` → `['success']`

**`dashboard/src/pages/BuildsPage.tsx`**
- `STATUS_CONFIG` keys: `PENDING/RUNNING/SUCCESS/FAILED/TIMEOUT` → `pending/running/success/failed/timeout`
- Filter state type and all filter comparisons updated
- `filterCounts` keys updated

**`dashboard/src/pages/BuildDetailPage.tsx`**
- `STATUS_CONFIG` keys normalized
- `isActive` check: `=== 'PENDING' || === 'RUNNING'` → `=== 'pending' || === 'running'`
- Completion banner comparisons, `displayStatus` default, failure panel guard all normalized

**`dashboard/src/api/index.ts`**
- `Build.status` type: `'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'TIMEOUT'`  
  → `'pending' | 'running' | 'success' | 'failed' | 'cancelled' | 'timeout'`

**`server/src/scripts/migrateBuildStatuses.js` — NEW**

Idempotent migration script. Runs `updateMany` for each uppercase → lowercase mapping:

```
PENDING → pending
RUNNING → running
SUCCESS → success
FAILED  → failed
TIMEOUT → timeout
```

Safe to run multiple times. Usage:
```bash
node --env-file=.env src/scripts/migrateBuildStatuses.js
```

---

## Task 2 — Build Logs to Filesystem (with Streaming)

### Problem

Build logs were stored as `logs: [String]` arrays inside MongoDB documents.
Docker image builds for large projects can produce thousands of log lines.
MongoDB documents have a hard 16 MB limit — long builds risk document rejection and data loss.
Even below the limit, deserializing large arrays on every `getBuildById` call wastes memory.

### Strategy

- Write full logs to `server/storage/build-logs/<buildId>.log`
- Keep `logSummary` (last 200 lines) in MongoDB for quick dashboard previews
- Keep `logs: [String]` field in schema for backward compatibility with historical builds
- `getBuildById` reads from filesystem if `logPath` exists, falls back to legacy fields

### `server/src/services/buildLog.service.js` — NEW

Filesystem log management service:

| Export | Description |
|--------|-------------|
| `initLogFile(buildId)` | Creates the log file, returns its absolute path |
| `appendLogLine(logPath, line)` | Appends a line using a cached `WriteStream` per build |
| `closeAppendStream(logPath)` | Flushes and releases the cached `WriteStream` on build completion |
| `readLogFile(logPath)` | Reads entire file as a string (for small files / legacy fallback) |
| `createLogReadStream(logPath, options)` | Returns a Node.js `ReadStream` — use for HTTP streaming |
| `getLogSize(logPath)` | Returns file size in bytes |

**Streaming design:**

`createLogReadStream()` returns a `ReadStream` that is piped directly to the HTTP response.
No content is loaded into memory — the OS streams bytes from disk to the socket.
This handles 100 MB logs the same as 2 KB logs.

**Append stream caching:**

A single `WriteStream` per active build is cached in a `Map`.
Docker build events arrive at high frequency; reusing one stream avoids the overhead of opening a new file descriptor per line.
`closeAppendStream` is called when the build completes to flush the buffer and release the file descriptor.

### `build.model.js` — MODIFIED

Added three new fields alongside the preserved legacy `logs: [String]`:

| Field | Type | Description |
|-------|------|-------------|
| `logPath` | String | Absolute path to the log file on disk |
| `logSize` | Number | File size in bytes at build completion |
| `lastLogAt` | Date | Timestamp of the last log write |

### `build.service.js` — MODIFIED

Both `_executeBuild` (Dockerode-based) and `runBuildPipeline` (pipeline-based) updated:
- `initLogFile` called after build record is created; `logPath` saved to DB immediately
- `pushLine` helper writes to both the in-memory buffer (for `logSummary`) and the filesystem simultaneously
- `closeAppendStream` called before `build.save()` on success and in the `catch` block on failure
- `logSize` and `lastLogAt` persisted at the end of each build
- `getBuildById`: if `build.logPath` exists, reads file and returns lines as `build.logs` — API response shape unchanged

### `build.controller.js` — MODIFIED

Added `streamBuildLogs` endpoint:
- Fetches the build record (ownership-scoped)
- If `logPath` exists, calls `createLogReadStream` and pipes to the response with `Content-Type: text/plain`
- Falls back to `logSummary` or legacy `logs[]` for historical builds with no `logPath`
- Stream `error` event handled — prevents crashing if the file is deleted mid-stream

### `build.routes.js` — MODIFIED

```
GET /builds/:id/logs   →  streamBuildLogs
```

Route registered before the `/:id` catch-all to avoid parameter shadowing.

---

## Task 3 — TTL Index Updates

### ContainerMetric

| Property | Before | After |
|----------|--------|-------|
| TTL field | `timestamp` | `timestamp` (unchanged) |
| Retention | 7 days | **30 days** |

Seven days was insufficient for monthly trend analysis in the metrics dashboard.

### Alert

Previously, only resolved alerts had a TTL (7 days via `resolvedAt`).
Unresolved alerts lived forever — an unbounded collection on a busy system.

| Index | Field | TTL | Scope |
|-------|-------|-----|-------|
| Existing | `resolvedAt` | 7 days | Resolved alerts only |
| **New** | `createdAt` | **90 days** | ALL alerts |

The two indexes coexist. MongoDB's TTL thread evaluates both independently —
resolved alerts are cleaned up faster (7 days), unresolved alerts are cleaned up after 90 days.

### `server/src/scripts/migrateTTLIndexes.js` — NEW

MongoDB schema changes to `expireAfterSeconds` are **not applied automatically** to existing indexes.
The migration script uses `collMod` to update the live TTL without dropping and recreating the index:

```bash
node --env-file=.env src/scripts/migrateTTLIndexes.js
```

Script actions:
1. Runs `collMod` on `containermetrics` to update TTL from `604800s` → `2592000s`
2. Checks if `alerts.createdAt` TTL exists — creates or updates to `7776000s`
3. Prints a verification table showing actual `expireAfterSeconds` values from live indexes

---

## Build Log Storage Architecture

```
Before:
  builds collection → { logs: ["line1", "line2", ...1000 lines] }  ← MongoDB document
  Risk: document size growth, memory spike on retrieval

After:
  builds collection → { logPath: "/storage/build-logs/<id>.log",
                         logSummary: "last 200 lines",
                         logSize: 45231,
                         lastLogAt: Date }
  server/storage/build-logs/
    └── 64a1b2c3d4e5f6g7h8.log   ← full log, unlimited size
```

---

## Migration Steps

Run after deploying the updated server:

```bash
cd server

# 1. Normalize existing uppercase build statuses
node --env-file=.env src/scripts/migrateBuildStatuses.js

# 2. Update TTL indexes (requires admin/dbAdmin privileges on the database)
node --env-file=.env src/scripts/migrateTTLIndexes.js
```

Both scripts are idempotent and safe to re-run.

---

## Files Modified

| File | Change |
|------|--------|
| `server/src/models/build.model.js` | Enum normalized, new log fields added |
| `server/src/models/containerMetric.model.js` | TTL 7d → 30d |
| `server/src/models/alert.model.js` | 90d absolute TTL on `createdAt` added |
| `server/src/services/buildLog.service.js` | **NEW** — filesystem log service |
| `server/src/services/build.service.js` | Filesystem logging integrated, statuses normalized |
| `server/src/services/pipeline.service.js` | Dual-case workaround removed |
| `server/src/controllers/build.controller.js` | `streamBuildLogs` added |
| `server/src/routes/build.routes.js` | `/builds/:id/logs` route added |
| `server/src/scripts/migrateBuildStatuses.js` | **NEW** — build status migration |
| `server/src/scripts/migrateTTLIndexes.js` | **NEW** — TTL index migration |
| `dashboard/src/api/index.ts` | `Build.status` type normalized |
| `dashboard/src/pages/BuildsPage.tsx` | STATUS_CONFIG + filters normalized |
| `dashboard/src/pages/BuildDetailPage.tsx` | STATUS_CONFIG + comparisons normalized |

---

## ✅ Outcome

→ Build status enum is a single source of truth — all lowercase, consistent across DB, API, and UI  
→ Build logs written to the filesystem — MongoDB documents no longer grow with log data  
→ `GET /builds/:id/logs` streams log files directly to the client — zero memory overhead for large logs  
→ Historical builds remain fully readable — `logSummary` and legacy `logs[]` serve as fallback  
→ ContainerMetric retention extended to 30 days — supports monthly trend analysis  
→ Alert collection now has a hard 90-day ceiling — no more unbounded accumulation  
→ Two idempotent migration scripts ready to run on the live database  

## What's Next

📅 **Day 92**

- Write integration tests for build status normalization
- Validate filesystem log rotation strategy for very long builds
- Audit any remaining uppercase status references in CLI commands
