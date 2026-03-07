# Day 60 — Container Health Monitoring & Auto-Recovery

## Overview

Day 60 extends DevOpsEase with an event-driven container health monitoring system. New Docker events (`oom`, `health_status`, `restart`) are captured in real time, classified using the existing failure intelligence engine, and stored in MongoDB. The UI surfaces health status inline on every container card, with a dedicated **Health** tab on the detail page showing a timeline and alert banner.

---

## What Changed

### Backend

| File                                  | Change                                                                                                                                 |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `models/containerHealth.model.js`     | **NEW** — Stores `healthStatus` (HEALTHY/DEGRADED/UNHEALTHY), failure type, restart count, history ring-buffer (last 20), TTL 30 days  |
| `services/containerHealth.service.js` | **NEW** — Orchestrates inspect → signals → classify → instability → persist. Auto-recovery for CRASH_LOOP with 5-minute cooldown guard |
| `docker/events.js`                    | **MODIFIED** — Added `oom`, `health_status`, `restart` handlers (fire-and-forget, non-blocking)                                        |
| `docker/containerActions.js`          | **MODIFIED** — `createContainer()` now accepts `maxRetryCount` → `HostConfig.RestartPolicy.MaximumRetryCount`                          |
| `routes/containers.routes.js`         | **MODIFIED** — Passes `restartPolicy` + `maxRetryCount` from request body to `createContainer()`                                       |
| `routes/containerHealth.routes.js`    | **NEW** — `GET /containers/:id/health`, `GET /containers/health/batch`                                                                 |
| `index.js`                            | **MODIFIED** — Registered `containerHealthRoutes`                                                                                      |

### Frontend

| File                                  | Change                                                                                         |
| ------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `api/index.ts`                        | **MODIFIED** — Added `ContainerHealthState`, `HealthHistoryEntry` types + `containerHealthApi` |
| `hooks/useContainerHealth.ts`         | **NEW** — `useContainerHealth()` (single) and `useContainerHealthBatch()` (batch, polling 30s) |
| `components/ui/HealthBadge.tsx`       | **NEW** — 🟢 Healthy / 🟡 Degraded / 🔴 Unhealthy status badge                                    |
| `components/HealthAlertBanner.tsx`    | **NEW** — Contextual alert banner with per-failure-type messaging                              |
| `components/HealthTimeline.tsx`       | **NEW** — Vertical timeline of health state changes, most-recent-first                         |
| `components/ContainerList.tsx`        | **MODIFIED** — Fetches health in a single batch call, passes `healthStatus` to cards           |
| `components/ContainerCard.tsx`        | **MODIFIED** — Accepts `healthStatus` prop, renders `<HealthBadge>` for non-healthy containers |
| `components/ContainerDetailsPage.tsx` | **MODIFIED** — Added `'health'` tab with banner + timeline                                     |
| `components/CreateContainerModal.tsx` | **MODIFIED** — Added Restart Policy dropdown and Max Retries input                             |
| `store/containersSlice.ts`            | **MODIFIED** — `createContainer` thunk type extended                                           |
| `api/containerActions.ts`             | **MODIFIED** — `create()` params extended                                                      |

---

## Architecture

```
Docker Event (oom / health_status / restart)
        │
        ▼
docker/events.js  (fire-and-forget)
        │
        ▼
containerHealth.service.js
  ├─ docker inspect
  ├─ fetch last 100 log lines
  ├─ collectSignals()          ← intelligence/signals/index.js (unchanged)
  ├─ classifyFailure()         ← intelligence/classifier.js (unchanged)
  ├─ analyzeInstability()      ← intelligence/instabilityAnalyzer.js (unchanged)
  ├─ mapToHealthStatus()       → HEALTHY / DEGRADED / UNHEALTHY
  ├─ ContainerHealth.upsert()  → MongoDB (with history ring-buffer)
  └─ attemptAutoRecovery()     → docker restart (if CRASH_LOOP + policy set + cooldown OK)
```

---

## Health State Mapping

| Classifier Type                     | Docker HEALTHCHECK | Instability Score | → Platform Status |
| ----------------------------------- | ------------------ | ----------------- | ----------------- |
| `HEALTHY`                           | any                | any               | **HEALTHY**       |
| `GRACEFUL_STOP`, `PAUSED`           | any                | any               | **HEALTHY**       |
| any                                 | `unhealthy`        | any               | **UNHEALTHY**     |
| any                                 | `starting`         | any               | **DEGRADED**      |
| `CRASH_LOOP`, `RESOURCE_EXHAUSTION` | any                | any               | **UNHEALTHY**     |
| any                                 | any                | > 0.4             | **DEGRADED**      |
| other                               | healthy/null       | ≤ 0.4             | **HEALTHY**       |

---

## API Reference

```
GET /containers/:id/health
    Returns: ContainerHealthState (healthStatus, history[], lastFailureType, ...)

GET /containers/health/batch?ids[]=id1&ids[]=id2
    Returns: { [containerId]: { healthStatus, lastFailureType, instabilityScore, ... } }
```

---

## Restart Policy

When creating a container, select the restart policy via the modal UI:

| Policy         | Docker value     | Behaviour                       |
| -------------- | ---------------- | ------------------------------- |
| None (default) | `no`             | Never auto-restart              |
| Always         | `always`         | Restart on any exit             |
| Unless Stopped | `unless-stopped` | Restart unless manually stopped |
| On Failure     | `on-failure`     | Restart only on non-zero exit   |

For **On Failure**, specify **Max Retries** (default: 3). Stored in `HostConfig.RestartPolicy.MaximumRetryCount`.

---

## Auto-Recovery

- Triggered when `CRASH_LOOP` is classified AND the container has a restart policy (`always`, `unless-stopped`, `on-failure`)
- **Cooldown**: max 1 recovery attempt per container per **5 minutes** (in-memory `Map`)
- Recovery restarts the container via the Docker API with a 5-second grace period
- All attempts and skips are logged (server logger)


## 🔮 What's Next

📅 Day 60 — Alert & Notification Engine

- Automatically generate typed alerts from health transitions, Docker OOM events, and resource threshold breaches
- Persist alerts in MongoDB with a 7-day TTL for auto-cleanup of resolved entries
- Deliver alerts in real-time via a per-user WebSocket channel (`/ws/alerts`)
- Surface alerts in the UI via a Bell badge in the header, a slide-out panel, and a full Alerts page with filters and pagination