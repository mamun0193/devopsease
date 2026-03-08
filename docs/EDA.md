# Event-Driven Architecture — DevOpsEase

The frontend previously polled nearly every endpoint on fixed intervals, creating excessive API traffic. This refactor replaced polling with WebSocket events, set `staleTime: Infinity` on static data, and kept polling only where real-time data is genuinely required. Result: ~80–90% reduction in API call volume.

---

## WebSocket Endpoints

Three new authenticated WS endpoints were added to `server/src/websocket/ws.js`, all using cookie JWT auth with RBAC ownership checks:

| Endpoint | Purpose |
|---|---|
| `/ws/events` | Per-user event stream (container updates, health, actions, failures) |
| `/ws/logs/:containerId` | Live container log streaming via `docker logs -f` |
| `/ws/metrics/:containerId` | Real-time container CPU/memory metrics (existed, fixed auth bug) |

**`eventBroadcaster.js`** — new general-purpose per-user broadcaster. Emits typed JSON events to all of a user's active connections.

**`logStreamer.js`** — new log streamer. Opens a Docker log stream and pipes lines to the WebSocket client as `{ type: "log_line", data }`.

---

## Backend Event Emission

**`docker/events.js`** — emits events via `eventBroadcaster` on Docker lifecycle changes:

| Trigger | Event Type |
|---|---|
| Container start/stop/die/restart/create/destroy | `container_update` |
| Health status change | `container_health_updated` |
| Failure analysis complete | `failure_analysis_updated` |

**`services/actionHistory.service.js`** — emits `action_history_updated` after writing an action record.

---

## Frontend Query Strategy

### Global QueryClient defaults (`App.tsx`)
```ts
{ retry: 1, staleTime: 5 * 60 * 1000, refetchOnWindowFocus: false, refetchInterval: false }
```

### Real-time polling (kept)
| Query | Interval |
|---|---|
| `containerStats` | 2s |
| `healthCheck` | 30s |
| `quota` | 20s |
| `topContainers` panel | 20s |
| `useBuild` (PENDING/RUNNING only) | 3s conditional |
| Admin observability metrics | 15s |

### Event-driven (WebSocket invalidation via `useContainerEvents`)
| Event Type | Query Keys Invalidated |
|---|---|
| `container_update` | `containers`, `containerInspect`, `containerAnalysis`, `containerStats`, `quota` |
| `action_history_updated` | `actions`, `actionStats` |
| `container_health_updated` | `containerHealth`, `containerHealthBatch`, `alerts`, `alertsUnresolvedCount` |
| `failure_analysis_updated` | `failureAnalysis`, `containerAnalysis` |

`alerts` and `alertsUnresolvedCount` are additionally invalidated by the existing `/ws/alerts` WebSocket.

### Static — `staleTime: Infinity` (mutation-driven only)
`builds`, `images`, `imageUsageSummary`, `networks`, `volumes`, `projects`, `tunnels`, `dockerhub-status`

All mutations already call `invalidateQueries` on success. `useTriggerBuild` and `BuildDetailPage` (on `build_complete`) also invalidate `images` since a completed build produces a new image.

---

## New Frontend Hooks

**`useContainerEvents.ts`** — connects to `/ws/events`, handles reconnect, invalidates React Query caches on each event type.

**`useLogStream.ts`** — connects to `/ws/logs/:containerId`, appends lines to local state. Uses `connectRef` pattern to avoid circular `useCallback` self-reference.

---

## Bug Fixes

**Top containers panel empty on load** — `/containers/top` read from the in-memory `streams` map which only populates when visiting a container detail page. Fixed by directly fetching stats for owned+running containers via Docker API with ownership filtering.

**WebSocket admin auth** — all three WS upgrade handlers had `ownsResource = false` for admin users (copy-paste bug). Fixed to `ownsResource = true` so admins can access any container's streams.

**WS connection race condition (`useMetricsStream`)** — calling `ws.close()` on a `CONNECTING` socket causes the browser warning _"WebSocket is closed before the connection is established"_. Fixed by replacing `onopen` with `() => ws.close()` when tearing down a still-connecting socket, letting it finish the handshake before closing.

**LogViewer duplicate expansion** — WebSocket log entries were constructed without an `id` field, making `log.id === undefined` for all of them. `expandedLine === log.id` was always `true`, so clicking any WS log expanded all simultaneously. Fixed by assigning `id: -(i + 1)` to WS log entries (negative to avoid collision with server-assigned positive IDs).

---

## Changed Files

| File | Change |
|---|---|
| `server/src/websocket/eventBroadcaster.js` | New — per-user event broadcaster |
| `server/src/websocket/logStreamer.js` | New — live log streaming |
| `server/src/websocket/ws.js` | Added `/ws/events`, `/ws/logs/:id`; fixed admin `ownsResource` bug |
| `server/src/docker/events.js` | Emits container/health/failure events |
| `server/src/services/actionHistory.service.js` | Emits `action_history_updated` |
| `server/src/routes/containers.routes.js` | `/containers/top` now queries Docker directly with ownership filter |
| `dashboard/src/hooks/useContainerEvents.ts` | New — WS event listener + cache invalidation |
| `dashboard/src/hooks/useLogStream.ts` | New — WS log streaming hook |
| `dashboard/src/hooks/useMetricsStream.ts` | Fixed CONNECTING-state close race |
| `dashboard/src/hooks/useContainers.ts` | Removed polling from all but stats/health hooks |
| `dashboard/src/hooks/useContainerHealth.ts` | Removed polling; event-driven |
| `dashboard/src/hooks/useAlerts.ts` | Removed polling; event-driven |
| `dashboard/src/hooks/useBuilds.ts` | `staleTime: Infinity`; trigger invalidates images |
| `dashboard/src/hooks/useImages.ts` | `staleTime: Infinity` |
| `dashboard/src/hooks/useNetworks.ts` | `staleTime: Infinity` |
| `dashboard/src/hooks/useVolumes.ts` | `staleTime: Infinity` |
| `dashboard/src/hooks/useProjects.ts` | `staleTime: Infinity` |
| `dashboard/src/hooks/useDockerHub.ts` | `staleTime: Infinity` |
| `dashboard/src/hooks/useTunnels.ts` | `staleTime: Infinity` |
| `dashboard/src/hooks/useQuota.ts` | Interval 15s → 20s |
| `dashboard/src/App.tsx` | Global QueryClient defaults; wired `useContainerEvents` |
| `dashboard/src/components/LogViewer.tsx` | Integrated `useLogStream`; fixed WS log `id` bug |
| `dashboard/src/components/TopContainersPanel.tsx` | Interval 10s → 20s |
| `dashboard/src/pages/BuildDetailPage.tsx` | On build complete, invalidates images |
| `dashboard/src/pages/ImagesPage.tsx` | Inline queries `staleTime: Infinity` |
| `dashboard/src/pages/AdminObservabilityPage.tsx` | Polling 5s → 15s |
