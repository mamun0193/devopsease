# 📅 Day 61 — Alert & Notification Engine

Real-time alerts generated from container health transitions, OOM events, and resource quota thresholds — deduplicated, persisted in MongoDB, and delivered instantly to the browser via a dedicated per-user WebSocket channel with a Bell badge, slide-out panel, and full alert history page.

---

## 🎯 Objective

- Automatically generate typed alerts from **health transitions**, **Docker OOM events**, and **resource threshold** breaches
- **Deduplicate** alerts with a 5-minute window to prevent alert storms
- Persist alerts in **MongoDB** with a 7-day TTL for auto-cleanup of resolved entries
- Deliver alerts in real-time via a **per-user WebSocket channel** (`/ws/alerts`)
- Surface alerts in the UI via a **Bell badge** in the header, a **slide-out panel**, and a full **Alerts page** with filters and pagination

---

## 🔐 Backend

### `models/alert.model.js` *(new)*
Mongoose schema for alert documents.
- Fields: `userId`, `containerId`, `type` (CRASH / CRASH_LOOP / OOM / HIGH_CPU / HIGH_MEMORY / QUOTA_WARNING / HEALTH_DEGRADED / HEALTH_UNHEALTHY), `severity` (INFO / WARNING / CRITICAL), `message`, `metadata`, `resolved`, `resolvedAt`
- Compound indexes: `{userId, resolved, createdAt}` and `{userId, containerId, type, resolved}`
- **7-day TTL index** on `resolvedAt` — resolved alerts auto-delete after one week

### `services/alert.service.js` *(new)*
Business logic for all alert operations.
- `createAlert()` — checks for a duplicate unresolved alert of the same type + container within the last **5 minutes** before inserting; broadcasts new alert via `alertBroadcaster`
- `getAlerts()` — paginated list with optional `resolved` and `severity` filters
- `getUnresolvedCount()` — fast count query used by the Bell badge
- `resolveAlert()`, `resolveAll()`, `resolveByContainer()` — mark alerts resolved and set `resolvedAt`

### `websocket/alertBroadcaster.js` *(new)*
Per-user WebSocket connection registry for real-time delivery.
- Maintains a `Map<userId, Set<WebSocket>>`
- `register(userId, ws)` — adds socket, auto-removes on `close` / `error`
- `broadcast(userId, alert)` — sends `{ type: "alert", data: alert }` JSON to all open sockets for the user
- `closeAll()` — graceful shutdown hook

### `routes/alert.routes.js` *(new)*
REST API for alert management.
- `GET /alerts` — paginated list (query: `page`, `limit`, `resolved`, `severity`)
- `GET /alerts/unresolved-count` — fast unresolved count
- `PATCH /alerts/:id/resolve` — resolve single alert
- `PATCH /alerts/resolve-all` — resolve all unresolved alerts for the user

### `services/containerHealth.service.js` *(modified)*
- After persisting a health state transition, fires typed alerts:
  - `CRASH_LOOP` → CRITICAL
  - `OOM` (from health classifier) → CRITICAL
  - `HEALTH_UNHEALTHY` → CRITICAL
  - `HEALTH_DEGRADED` → WARNING
- Alert metadata includes: `previousStatus`, `newStatus`, `failureType`, `instabilityScore`, `restartCount`, `exitCode`

### `services/resourceMonitor.service.js` *(modified)*
- After each quota usage update, calls `_checkResourceThresholds()`:
  - CPU ≥ 80% of quota → WARNING `HIGH_CPU`
  - CPU ≥ 95% of quota → CRITICAL `HIGH_CPU`
  - Memory ≥ 80% → WARNING `HIGH_MEMORY`
  - Memory ≥ 95% → CRITICAL `HIGH_MEMORY`
  - Container count ≥ 80% → WARNING `QUOTA_WARNING`

### `docker/events.js` *(modified)*
- On Docker `oom` event: looks up container ownership, immediately fires a CRITICAL `OOM` alert with container metadata

### `websocket/ws.js` *(modified)*
- Added `/ws/alerts` upgrade path with JWT cookie authentication
- Successful upgrades register the WebSocket with `alertBroadcaster` for the user
- `alertBroadcaster.closeAll()` called during graceful shutdown

### `index.js` *(modified)*
- Registered `alertRoutes` at `/alerts`

---

## 🖥️ Frontend

### `api/alerts.ts` *(new)*
TypeScript API layer for alert endpoints.
- `Alert` and `AlertsResponse` interfaces
- `alertsApi.getAlerts()`, `getUnresolvedCount()`, `resolveAlert()`, `resolveAll()`

### `store/alertSlice.ts` *(new)*
Redux slice managing client-side alert state.
- State: `alerts[]`, `unresolvedCount`, `isLoading`
- Reducers: `setAlerts`, `addAlert`, `markResolved`, `markAllResolved`, `setUnresolvedCount`, `setLoading`

### `hooks/useAlerts.ts` *(new)*
React Query hooks for alert data.
- `useAlerts()` — fetches paginated alerts every 30 seconds, syncs to Redux
- `useUnresolvedAlertCount()` — polls every 15 seconds, updates Bell badge count
- `useResolveAlert()` and `useResolveAllAlerts()` — mutation hooks that invalidate queries and dispatch Redux reducers

### `hooks/useAlertSocket.ts` *(new)*
WebSocket hook for real-time alert delivery.
- Connects to `/ws/alerts` with automatic exponential backoff reconnect
- Uses a **closure-scoped `active` flag** (not a React ref) — React 18 StrictMode safe; each effect invocation owns its own flag so the `onclose` handler of a cleaned-up socket never triggers a reconnect loop
- On incoming alert: `dispatch(addAlert)`, invalidates React Query cache, dispatches a severity-mapped toast (CRITICAL → error, WARNING → warning, INFO → info)

### `components/AlertsPanel.tsx` *(new)*
Slide-out notification panel.
- Rendered via `ReactDOM.createPortal` into `document.body` — escapes the sticky header's stacking context so it always overlays all page content
- Shows the 30 most recent alerts with severity colour coding: CRITICAL → red, WARNING → amber, INFO → blue
- Type-specific icons (Zap for crashes, MemoryStick for OOM/memory, Cpu for CPU, Gauge for quota, Heart for health)
- Per-alert ✓ resolve button; "Resolve all" action in the panel header
- Animated entry/exit via `framer-motion`

### `pages/AlertsPage.tsx` *(new)*
Full-page alert history at `/alerts`.
- Filter row: severity tabs (ALL / CRITICAL / WARNING / INFO) + resolved status toggle (all / unresolved / resolved)
- Server-side pagination with next/prev controls
- "Resolve All" button in the page header

### `store/index.ts` *(modified)*
- Added `alerts: alertReducer` to the root Redux store

### `App.tsx` *(modified)*
- `AlertSocketProvider` wrapper component mounts `useAlertSocket()` and `useUnresolvedAlertCount()` once at the app root
- Added `/alerts` protected route → `AlertsPage`

### `components/Header.tsx` *(modified)*
- Bell button with red unresolved-count badge (capped at `99+`)
- Clicking the Bell opens/closes `AlertsPanel`

### `api/index.ts` *(modified)*
- Re-exports `alertsApi`, `Alert`, and `AlertsResponse` from `./alerts`

---

## ✅ Outcome

> DevOpsEase now has a **complete alert pipeline** — from automatic detection at the source (health, OOM, resource) through server-side deduplication and persistence, real-time WebSocket push to the browser, and a polished UI with a live badge, slide-out panel, and searchable history page. Users are notified the moment a container enters trouble, without any manual polling.

---

## 🔮 What's Next

📅 Day 62 — Container Restart Policies

- Implement configurable restart policies (no restart, always, on-failure with max retry count) for containers
- Integrate with the alert system to automatically attempt restarts on crashes and OOMs, and generate alerts for restart attempts and failures
- Add UI controls to set restart policies per container and view restart history in the Alerts page