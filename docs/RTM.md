# RTM — Release Technical Memo
## Scalable Metrics Architecture

**Date:** 2026-03-10  
**Scope:** DevOpsEase Backend + Frontend

---

## Summary

Redesigned the container metrics pipeline from per-container polling to a global host-level collection architecture capable of scaling to large deployments.

---

## Problem

The previous architecture opened one Docker stats stream (or polling interval) per container. At scale this produces an unsustainable number of Docker API calls per minute.

---

## Changes

### New Service — `globalMetricsCollector.js`
- Single background daemon collecting stats for ALL running containers
- Batched `container.stats()` calls with concurrency limit (50 concurrent)
- 2-second collection cycle with 30-second reconciliation
- In-memory cache: `Map<containerId, { latest, buffer(60pts), aggBuffer }>`
- Bulk `insertMany()` persistence every ~30s (instead of per-container `create()`)
- Listener pattern for WebSocket push (`onUpdate(containerId, fn)`)
- **Redis Pub/Sub for PM2 cluster mode:**
  - Leader election via `SETNX` — only ONE process polls Docker
  - Leader publishes each data point to channel `devopsease:metrics`
  - All workers subscribe and update their local cache from the channel
  - Leader lock TTL = 10s, renewed every 5s — auto-failover if leader dies
  - Graceful fallback to single-process mode when Redis is unavailable

### Refactored — `metricsStreamer.js`
- No Docker streams opened. Reads from `globalMetricsCollector` cache via listeners.
- WebSocket subscribers receive data pushed by collector on every new data point.

### Updated — `resourceMonitor.service.js`
- Reads CPU/memory from cache (zero Docker calls). Falls back to direct Docker stat on cache miss only.

### Updated — `containers.routes.js`
- `GET /containers/top` — reads from cache (was: per-container Docker stats call)
- `GET /containers/:id/recent-metrics` — **new endpoint** returning 2-minute buffer

### Updated — `useMetricsStream.ts`
- Fetches `/recent-metrics` on page load → chart renders immediately
- WebSocket then streams new points → no more empty chart on first visit

### Removed
- `metricsCollector.service.js` — superseded
- `statsStreamManager.js` — superseded

---

## Architecture

```
Docker daemon
      ↓
globalMetricsCollector  [leader only polls Docker]
      ↓
Redis Pub/Sub  →  all workers subscribe  →  local metricsCache
      ├── WebSocket subscribers  (listener-based push, 0 Docker streams)
      ├── /containers/top        (cache read)
      ├── /containers/:id/recent-metrics  (2-min ring buffer)
      └── MongoDB  (insertMany every ~30s, leader only)
             ↓
      metricsAggregator  (30s → 10m → 1h, unchanged)
```

**Frontend flow:**
```
Page load → GET /recent-metrics → render chart (instant)
          → WebSocket open      → append live points (2s updates)

Time range → GET /metrics-history?range=1h|1d|1w → MongoDB query
```

---

## Data Retention

| Resolution | Interval             | Retention |
| ---------- | -------------------- | --------- |
| 30s        | ~30s aggregates      | 2 hours   |
| 10m        | 10-minute aggregates | 48 hours  |
| 1h         | hourly aggregates    | 7 days    |

---

## User Isolation

The `metricsCache` is global but access is enforced at 3 layers:
- **WebSocket** — `ownershipGuard` middleware before `subscribeToMetrics()`
- **REST** — `ownershipGuard` on all metrics endpoints
- **DB** — metrics stored with `ownerId`, queries scoped to `containerId`

