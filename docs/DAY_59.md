# 📅 Day 59 — Real-Time Container Metrics Streaming & Observability

Live container CPU, memory, and network metrics streamed via WebSocket, visualized as time-series charts, with persistent historical storage and a top containers dashboard.

---

## 🎯 Objective

- Stream container metrics in real-time using **WebSocket**
- Visualize CPU and memory usage as **live time-series charts**
- Persist metrics snapshots to **MongoDB** for historical analysis
- Add a **time-range selector** (1 min / 1 hour / 1 day / 1 week) for long-term data review
- Show a **Top Containers** panel ranked by CPU and memory usage
- Integrate the metrics panel into the **Analysis tab** of the container detail page

---

## 🔐 Backend

### `websocket/metricsStreamer.js` *(new)*
Core streaming engine.
- Polls Docker stats every **2 seconds** per subscribed container
- Maintains a **circular in-memory buffer** of 60 data points (~2 minutes)
- Broadcasts live metrics to all WebSocket subscribers
- Persists a snapshot to MongoDB every **30 seconds**
- Exposes `queryMetricsByRange(containerId, range)` for REST history queries
- Exposes `getTopContainers()` — top 5 by CPU + memory from active streams

### `models/containerMetric.model.js` *(new)*
MongoDB schema for persistent metrics storage.
- Fields: `containerId`, `ownerId`, `cpuPercent`, `memoryUsedMB`, `memoryLimitMB`, `networkRxMB`, `networkTxMB`, `timestamp`
- **7-day TTL index** for automatic cleanup
- Compound index on `(containerId, timestamp)` for efficient range queries

### `websocket/ws.js` *(modified)*
- Added `/ws/metrics/:containerId` WebSocket path
- JWT authentication + RBAC ownership check on upgrade
- Integrates with `metricsStreamer.subscribeToMetrics`
- Graceful shutdown calls `stopAllStreams`

### `routes/containers.routes.js` *(modified)*
- `GET /containers/top` — returns top CPU + memory containers
- `GET /containers/:id/metrics-history?range=1m|1h|1d|1w` — returns historical data points

---

## 🖥️ Frontend

### `hooks/useMetricsStream.ts` *(new)*
Custom React hook managing the WebSocket connection.
- Auto-reconnects on disconnect with backoff
- Falls back to **REST polling** (`useContainerStats`) when WebSocket is unavailable
- Maintains a rolling 60-point `dataPoints` array for chart rendering

### `ContainerStatsPanel.tsx` *(rewritten)*
- Stat cards: **CPU %**, **Memory used/limit**, **Network RX/TX**
- `recharts` AreaCharts for CPU and memory time-series
- **Time-range selector** (1 min · 1 hour · 1 day · 1 week)
  - `1 min` → live WebSocket data
  - `1h / 1d / 1w` → fetches from MongoDB via REST
- X-axis labels adapt to selected range (`mm:ss` / `HH:mm` / `MM/DD HH:mm`)
- Moved from **Info tab** → **Analysis tab**

### `TopContainersPanel.tsx` *(new)*
Dashboard widget showing resource leaders.
- Lists top 5 containers by CPU and by memory
- Mini progress bars, live values, links to container detail pages
- Polls every 10 seconds, hidden when no data available

### `HomePage.tsx` *(modified)*
- `TopContainersPanel` added below `ResourceUsagePanel`

### `ContainerDetailsPage.tsx` *(modified)*
- Analysis tab now renders: `ContainerStatsPanel` → `FailureAnalysis`

---

## ✅ Outcome

> DevOpsEase now provides **real-time observability** — live streaming metrics with WebSocket, historical trend analysis with MongoDB-backed time-range queries, and a dashboard-level view of the heaviest resource consumers.

---

## 🔮 What's Next

📅 Day 60 — Container Health Monitoring

- proactive container health monitoring
- event-driven failure detection
- persistent container health state
- restart policy configuration
- auto-recovery for crash loops
- visible health indicators in UI