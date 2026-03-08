# Day 62 — Container Restart Policies & Health Pipeline Hardening

## Overview

Day 62 adds full restart-policy support to DevOpsEase — configurable at container creation, stored as Docker labels, and enforced server-side by the health pipeline — alongside a hardening pass that fixed 10 bugs across the health monitoring, alert, and WebSocket layers.

---

## What Changed

### Backend

| File | Change |
|------|--------|
| `routes/containers.routes.js` | Validates `restartPolicy` enum and `maxRetryCount` (1–100); passes both to `createContainer()` |
| `docker/containerActions.js` | Stores `devopsease.restartPolicy` and `devopsease.restartLimit` labels on all non-`no` policy containers; sets native `MaximumRetryCount` for `on-failure` |
| `services/containerHealth.service.js` | Fixed 64→12-char container ID mismatch; removed `attemptAutoRecovery()` (was resetting Docker's restart counter causing infinite loops); added `enforceRestartLimit()` — reads label, calls `container.update()` + `container.stop()` when count ≥ limit; re-inspects after enforcement; passes `CreatedAt` through for correct MTBF |
| `intelligence/instabilityAnalyzer.js` | `calculateMTBF()` now uses `createdAt` (container birth time) instead of `startedAt` (last restart) — fix for incorrect MTBF values |
| `services/containerInspect.service.js` | Inspect response includes `restartPolicy: { name, maximumRetryCount, restartLimit }` |
| `services/containerCache.service.js` | Cached summaries carry the same `restartPolicy` object |
| `docker/events.js` | Added `die` event to health triggers alongside `restart`, `oom`, `health_status` |
| `websocket/ws.js` | Exec and metrics handlers normalise container ID to 12-char via `.substring(0, 12)` |

### Frontend

| File | Change |
|------|--------|
| `components/CreateContainerModal.tsx` | `maxRetryCount` sent for all non-`no` policies (not just `on-failure`); Max Retries input shown for all non-`no` policies |
| `api/index.ts` | `ContainerInspect` interface extended with `restartPolicy?` field |
| `components/ContainerInfo.tsx` | Added Restart Policy section showing policy name, retry count, and platform limit |
| `components/ContainerControls.tsx` | Added missing `queryFn` to `fetchQuery` call; post-action refetch now includes `quota` query key |
| `hooks/useAlertSocket.ts` | Cleanup only closes socket when `readyState === WebSocket.OPEN` — fixes React 18 StrictMode warning |
| `components/AlertsPanel.tsx` | Added `useAlerts({ resolved: false })` call so panel fetches its own data instead of relying on Redux state set by `AlertsPage` |
| `components/HealthTimeline.tsx` | Synthesises a current-state entry when transition history is empty (healthy containers no longer show "No health state changes recorded yet") |
| `components/ContainerDetailsPage.tsx` | Removed static subtitle text from Health tab header |

---

## Bugs Fixed

| # | Bug | Fix |
|---|-----|-----|
| 1 | Containers restarting past configured limit | Removed `attemptAutoRecovery`; `enforceRestartLimit` disarms via `update` + `stop` |
| 2 | Health records written for wrong container | All DB ops now use `inspectData.Id.substring(0, 12)` |
| 3 | `enforceRestartLimit` skipped `on-failure` containers | Rewritten to handle all non-`no` policies uniformly |
| 4 | MTBF showed time-since-last-restart | Switched reference anchor to `inspectData.Created` |
| 5 | Alert panel always showed "No alerts yet" | Panel now calls `useAlerts()` internally |
| 6 | WebSocket StrictMode warning on alert connect | Guard: only close when `readyState === WebSocket.OPEN` |
| 7 | Quota widget stale after container actions | Added `refetchQueries({ queryKey: ['quota'] })` to post-action flush |
| 8 | `fetchQuery` runtime error in ContainerControls | Added missing `queryFn` property |
| 9 | Healthy containers showed empty health timeline | Synthesise entry from current state when history is empty |
| 10 | WebSocket exec/metrics silently dropped | Both handlers now normalise parsed ID to 12-char |

---

## Outcome

DevOpsEase now has production-grade restart policy enforcement — policies and limits are set at creation, stored as Docker labels, and enforced in real time without interfering with Docker's native restart daemon. The health monitoring, alert panel, and WebSocket layers are significantly more reliable.

---

## What's Next

📅 Day 63 — System Resource Dashboard

- show host-level CPU, memory, disk, and network usage in a new dashboard page
- aggregate Docker stats across all containers, expose via new API endpoint
- new ResourceDashboard page with charts and alerts for high usage