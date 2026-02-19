# 📅 Day 46 — Image Build Engine

We implemented a **production-grade Docker Image Build Engine** inside DevOpsEase. Users can write Dockerfiles in-browser, trigger builds, stream live log output over WebSockets, and browse full build history — all enforced by concurrency limits, storage quotas, timeouts, and audit trails.

---

## 🎯 Objective

Enable in-platform Docker image builds with:

1. **Inline Dockerfile authoring** — no file upload, no Docker CLI access required.
2. **Real-time log streaming** — WebSocket push, not polling.
3. **Deterministic state machine** — every build transitions through `PENDING → RUNNING → SUCCESS / FAILED / TIMEOUT` with no ambiguous states.
4. **Quota enforcement** — per-user concurrency, storage cap, Dockerfile size, and tag uniqueness.
5. **Persistent history** — all builds and resulting images stored in MongoDB with full metadata.
6. **Resource model integration** — successful builds register both a `BUILD` and `IMAGE` entry in the Unified Resource Model.

---

## 🏗 Backend Implementation

### 1. Data Models

#### `server/src/models/build.model.js`
Captures the full lifecycle of a build attempt.

| Field            | Type         | Notes                                                |
| ---------------- | ------------ | ---------------------------------------------------- |
| `userId`         | ObjectId ref | Owner of the build                                   |
| `tag`            | String       | User-supplied image tag (e.g. `my-app:v1`)           |
| `status`         | Enum         | `PENDING \| RUNNING \| SUCCESS \| FAILED \| TIMEOUT` |
| `logSummary`     | String       | Last 200 lines of build output (trimmed on write)    |
| `dockerImageId`  | String       | Set on success; used for stale-build reconciliation  |
| `imageSizeBytes` | Number       | Raw bytes from Docker inspect                        |
| `layerCount`     | Number       | Number of image layers                               |
| `error`          | String       | Human-readable failure reason                        |
| `startedAt`      | Date         | When Docker build stream began                       |
| `completedAt`    | Date         | When build reached terminal state                    |

**Indexes:** compound `userId + createdAt` (history queries), `userId + status` (active build count), `status` (recovery sweep).

#### `server/src/models/image.js`
Tracks each successfully built image as a first-class entity.

| Field           | Type         | Notes                                        |
| --------------- | ------------ | -------------------------------------------- |
| `userId`        | ObjectId ref | Owner                                        |
| `tag`           | String       | Unique per user (enforced by compound index) |
| `dockerImageId` | String       | Docker image SHA                             |
| `sizeMB`        | Number       | Derived from `imageSizeBytes`                |
| `layerCount`    | Number       | From Docker inspect                          |
| `buildId`       | ObjectId ref | Links back to originating build              |

**Unique compound index:** `userId + tag` — prevents duplicate tags per user at the database level, independent of application logic.

#### `server/src/models/User.js` (modified)
Added `storageUsedMB: Number (default: 0)` field. Incremented atomically on successful builds, decremented when images are deleted.

---

### 2. Build Service — `server/src/services/build.service.js`

The core orchestration layer. Handles all synchronous validation and asynchronous build execution.

#### Pre-flight Validation (synchronous, before DB write)
All checks run before creating any database record to avoid orphaned `PENDING` entries:

| Check                   | Limit           | Error |
| ----------------------- | --------------- | ----- |
| Dockerfile size         | ≤ 200 KB        | `400` |
| Tag uniqueness per user | per-user unique | `409` |
| Active builds per user  | ≤ 2 concurrent  | `429` |
| Storage quota           | < 5 GB total    | `429` |

#### Build Flow
1. Creates a `Build` record in `PENDING` state and immediately returns it to the HTTP handler (so the API responds `202` without blocking).
2. Calls `_executeBuild()` asynchronously (not awaited by the request handler).

#### `_executeBuild()` — async, fire-and-forget
```
PENDING
  → RUNNING    (startedAt set, WebSocket subscribers notified)
  → build tar stream created in temp dir (os.tmpdir()/devopsease-builds/<buildId>/)
  → docker.buildImage() called with { t: tag } options
  → docker.modem.followProgress() streams log lines
      → each chunk: broadcasted via buildSocket, appended to logSummary buffer
  → race: buildPromise vs 15-min timeoutPromise
  → on success:
      docker.getImage(tag).inspect()     → extract size + layers
      Image.create(...)                  → persist image record
      User.storageUsedMB += sizeMB       → update quota counter
      resourceService.registerResource() → register BUILD resource
      resourceService.registerResource() → register IMAGE resource
      Build.status = SUCCESS
      buildSocket.broadcastBuildComplete()
  → on timeout:
      stream.destroy()
      docker image rm (best-effort)
      Build.status = TIMEOUT
  → on error:
      docker image rm (best-effort)
      Build.status = FAILED, Build.error = message
  → finally: cleanupTempDir()
```

#### Stale Build Recovery — `recoverStaleBuilds()`
Called once at server startup. Queries for all builds in `PENDING` or `RUNNING` state. For each:
- Checks if the Docker image actually exists via `docker.getImage(tag).inspect()`.
- If yes → marks `SUCCESS` and creates the `Image` record retroactively.
- If no → marks `FAILED` with reason `"Recovered: image not found after server restart"`.

---

### 3. Build Audit — `server/src/services/build.audit.js`

Fire-and-forget structured logging for build lifecycle events. Mirrors the auth audit pattern.

| Event           | Severity | Logged When                   |
| --------------- | -------- | ----------------------------- |
| `BUILD_STARTED` | `info`   | Build moves to `RUNNING`      |
| `BUILD_SUCCESS` | `info`   | Image created, build complete |
| `BUILD_FAILED`  | `warn`   | Build fails for any reason    |

Each event writes to both `SecurityLog` (MongoDB TTL collection) and the structured JSON logger.

---

### 4. WebSocket Streaming

#### `server/src/websocket/build.socket.js`
In-memory pub/sub for live log delivery. No Redis required.

```js
// Internal: Map<buildId, Set<WebSocket>>
broadcastBuildLog(buildId, line)      // sends { type: 'build_log', data: line }
broadcastBuildComplete(buildId, status) // sends { type: 'build_complete', data: status }
subscribeToBuild(buildId, ws)         // registers ws to receive that build's logs
unsubscribeFromBuild(buildId, ws)     // removes ws; cleans up empty sets
```

#### `server/src/websocket/ws.js` (modified)
Extended the existing `upgrade` handler with a new path pattern `/ws/build/:buildId`:
- Validates JWT from `authToken` cookie (same as exec handler).
- Verifies the build belongs to the authenticated user (ownership check).
- Calls `subscribeToBuild()` to register the connection.
- On `close`: calls `unsubscribeFromBuild()`.

---

### 5. HTTP API — `server/src/routes/build.routes.js`

All routes protected by `authMiddleware`.

| Method | Path          | Handler        | Returns                                         |
| ------ | ------------- | -------------- | ----------------------------------------------- |
| `POST` | `/builds`     | `triggerBuild` | `202` `{ buildId, wsUrl, status: 'PENDING' }`   |
| `GET`  | `/builds`     | `listBuilds`   | Array of builds (no `logSummary` or Dockerfile) |
| `GET`  | `/builds/:id` | `getBuildById` | Full build object including `logSummary`        |

#### `triggerBuild` controller
- Validates `tag` (required, max 128 chars) and `dockerfileContent` (required).
- Calls `buildService.startBuild(userId, tag, dockerfileContent)`.
- Returns `wsUrl: ws://<host>/ws/build/<buildId>` for the client to connect.

---

### 6. Utilities

#### `server/src/utils/tempDir.js`
```js
createTempBuildDir(buildId)  // creates os.tmpdir()/devopsease-builds/<buildId>/
cleanupTempDir(dirPath)      // safe rmSync with existsSync guard; never throws
```
Ensures temp directories are always cleaned up, even on build failure or timeout.

---

### 7. Server Wiring — `server/src/index.js`

- Mounted `buildRoutes` at `/builds`.
- Called `buildService.recoverStaleBuilds()` after DB connection established.
- Added `tar-fs` to `package.json` dependencies.

---

## 🖥️ Frontend Implementation

### New Hooks

#### `dashboard/src/hooks/useBuilds.ts`
| Hook                | Behaviour                                                                                     |
| ------------------- | --------------------------------------------------------------------------------------------- |
| `useBuilds()`       | `GET /builds` with 10s polling interval                                                       |
| `useBuild(id)`      | `GET /builds/:id`; refetches every 3s if build is `PENDING` or `RUNNING`, stops when terminal |
| `useTriggerBuild()` | `POST /builds` mutation; on success invalidates `['builds']` cache                            |

#### `dashboard/src/hooks/useBuildSocket.ts`
- Connects to `ws://<host>/ws/build/:buildId` when `enabled` is `true` (build is active).
- On `message`: appends `build_log` lines to local state.
- On `build_complete`: sets `finalStatus`, closes socket, stops reconnection.
- On `close` without `finalStatus`: schedules a reconnect attempt after 2s.
- On unmount: closes socket and cancels pending reconnect timer.

---

### New Pages

#### `dashboard/src/pages/BuildsPage.tsx`
- Renders `ResourceNav` + `Header` (no container filter stats).
- Shows paginated list of builds with `StatusBadge`, duration, image size, layer count.
- Expandable inline form: tag input + Dockerfile `<textarea>` editor.
- On submit: calls `useTriggerBuild`, navigates to `/builds/:buildId` on success.
- Form-level error display for `409` (duplicate tag) and `429` (quota exceeded).

#### `dashboard/src/pages/BuildDetailPage.tsx`
- Fetches build via `useBuild(id)` (smart polling for active builds).
- Conditionally establishes WebSocket via `useBuildSocket` when `status` is `PENDING/RUNNING`.
- Displays info cards: Duration, Image Size, Layers, Created At.
- Live log terminal:
  - Line numbers, monospace font, dark background.
  - Error lines (`ERROR`, `fatal`, `panic`) highlighted red.
  - Warning lines highlighted yellow.
  - Auto-scrolls to latest line via `ref + scrollIntoView`.
  - Shows "Live" / "Reconnecting…" / "Connecting…" indicator.
- Completion banner (success / failed / timeout) animates in via `AnimatePresence`.

---

### Navigation Refactor

#### `dashboard/src/components/ResourceNav.tsx`
Horizontal tab bar below the fixed header (`sticky top-16 z-40`):
```
[ Home ]  [ Containers ]  [ Builds ]
```
- Blue underline accent on active tab.
- Active detection: exact match for `/dashboard`, `startsWith` for `/containers` and `/builds`.
- No global state, no new libraries — just `useLocation` + `useNavigate`.

#### Route Structure (after refactor)

| Path               | Component                         | Guard            |
| ------------------ | --------------------------------- | ---------------- |
| `/dashboard`       | `HomePage` (system overview)      | `ProtectedRoute` |
| `/containers`      | `ContainersPage` (container list) | `ProtectedRoute` |
| `/builds`          | `BuildsPage`                      | `ProtectedRoute` |
| `/builds/:buildId` | `BuildDetailPage`                 | `ProtectedRoute` |
| `/container/:id`   | `ContainerDetailsPage`            | `ProtectedRoute` |

`/dashboard` preserved for backward compatibility — existing sessions and bookmarks continue to work.

---

### Header Toolbar Fix

The container filter stat buttons (All / Running / Stopped / Paused) in `Header.tsx` were conditionally gated behind `{onFilterChange && (...)}`. Only `ContainersPage` passes this prop — Home and Builds pages now render a clean header with no container controls.

---

## 🧪 Verification

- **TypeScript**: `npx tsc --noEmit` → **exit code 0**, zero errors across all new and modified files.
- **Server startup**: `recoverStaleBuilds()` runs and logs reconciled build counts.
- **API**: `POST /builds` responds `202` immediately; build runs async.
- **WebSocket**: Client connects, receives streamed lines, disconnects cleanly on completion.
- **Page refresh during build**: `useBuildSocket` reconnects; `useBuild` continues polling until terminal.

---

## ✅ Outcome

> DevOpsEase can now **build Docker images from inline Dockerfiles** with real-time streaming logs, enforced quotas, persistent history, WebSocket reconnect handling, and full integration into the Unified Resource Model — from a clean browser UI with no CLI access required.

---

# 🔮 What's Next: Day 47 — Build Intelligence Integration

Now extend your Failure Engine to include builds.

**Detect:**
- Base image not found
- Syntax error
- Layer explosion
- Permission denied
- Build timeout
- Disk space failure

**Classify:**
- `BUILD_SYNTAX_ERROR`
- `BUILD_RESOURCE_EXHAUSTION`
- `BUILD_BASE_IMAGE_MISSING`
- `BUILD_UNKNOWN`

**Frontend:**
- Failure explanation panel
- Confidence score
- Highlight failing stage

**Outcome:**
> Builds become explainable.
