# Day 63 — Metrics Reliability & System Observability

## Overview

Day 63 makes the metrics pipeline production-grade. It adds automatic failure detection, WebSocket memory protection, cache memory limits, cycle performance tracking, and a live system health dashboard accessible to admins.

---

## What Changed

### Backend

| File                                    | Change                                                                                                                                                                                  |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `services/globalMetricsCollector.js`    | Added `MAX_TRACKED_CONTAINERS` guard (200k) with stale eviction; cycle duration tracking via `performance.now()`; exposed `getCollectorStats()`, `getLastCycleTimestamp()`, `restart()` |
| `services/collectorWatchdog.service.js` | **New** — polls every 5s, triggers `restart()` if no cycle completes in 10s; exposes `getRestartCount()`                                                                                |
| `websocket/metricsStreamer.js`          | Backpressure guard: closes WebSocket clients with >1MB buffered output; added `getSubscriberCount()` export                                                                             |
| `routes/system.routes.js`               | **New** — `GET /system/metrics` (admin-only) returning collector stats, cache size, WS subscribers, Redis health, watchdog restarts, aggregation status                                 |
| `index.js`                              | Starts `collectorWatchdog` after `globalMetricsCollector`                                                                                                                               |
| `shutdownManager.js`                    | Stops `collectorWatchdog` before `globalMetricsCollector` on graceful shutdown                                                                                                          |

### Frontend

| File                               | Change                                                                                                                                                                                                                                                                                               |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pages/AdminObservabilityPage.tsx` | Added `MetricsPipelinePanel` — polls `/system/metrics` every 5s; shows containers tracked, WS subscribers, collector cycle time (amber if >1800ms), watchdog restarts, Redis status, process role (leader/follower), aggregation pipeline status; STALLED badge when collector hasn't cycled in >10s |
| `api/index.ts`                     | Added `PipelineMetrics` interface and `systemApi.getMetrics()` typed call                                                                                                                                                                                                                            |

---

## Features

| Feature                    | Detail                                                      |
| -------------------------- | ----------------------------------------------------------- |
| Collector Watchdog         | Auto-restarts stalled collector after 10s of inactivity     |
| WebSocket Backpressure     | Slow clients consuming >1MB buffer are disconnected         |
| Cache Memory Guard         | Evicts stale containers if cache exceeds 200k entries       |
| Cycle Performance Tracking | `lastCycleMs` and `lastCycleTimestamp` measured every cycle |
| System Metrics API         | `GET /system/metrics` — admin-only internal health endpoint |
| Redis Health Exposure      | `redisConnected` surfaced in API and UI                     |
| Graceful Shutdown          | Watchdog stops cleanly before collector on SIGTERM/SIGINT   |

---

## Outcome

The metrics pipeline is now self-healing: the watchdog detects stalls and restarts the collector automatically. WebSocket memory leaks from slow clients are prevented. Admins have a live view of pipeline health at `/admin/observability`.

---

## What's Next

📅 Day 64 — Repository Resource Model

- Add `repository.model.js` with fields: `userId`, `provider`, `repoName`, `owner`, `cloneUrl`, `defaultBranch`, `status`, `lastBuildId`, `createdAt`
- Implement `POST /repos/connect` to link a repository to a user account
