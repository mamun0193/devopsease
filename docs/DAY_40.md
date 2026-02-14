# Day 40 — Exec Lifecycle Hardening

> **Focus:** Terminal Stability  
> **Core Principle:** "Every session must have a deterministic end."

---

## 🎯 Goal

Implement **centralized exec session lifecycle management** to eliminate zombie sessions, orphaned TTYs, idle resource leaks, race conditions, and double cleanup bugs. Terminal should behave like AWS CloudShell — deterministic, self-healing, and production-ready.

---

## 🛠️ Key Technical Changes

### 1. Exec Session Registry (`src/websocket/execSessionRegistry.js`) — NEW

- **Pattern:** Singleton registry with session-keyed `Map` (UUID per session)
- **State Machine:** `active` → `terminating` → `closed` (prevents double cleanup)
- **Idle Timeout:** Configurable via `EXEC_IDLE_TIMEOUT_MS` (default: 5 min)
- **Unified Cleanup:** Single `_cleanupSession()` path for all termination scenarios
- **Metrics:** `activeExecSessions` incremented on create, decremented on cleanup (only place)

### 2. Exec Handler Refactor (`src/websocket/execHandler.js`)

- Removed scattered cleanup logic, local `cleanedUp`/`metricsIncremented` flags
- Removed direct `metricsRegistry.increment`/`decrement` calls
- Added `userId` parameter for session tracking
- Added client-initiated `terminate` message handling
- Preemptive termination of existing sessions for same container/user
- Shell priority: `/bin/bash` preferred → `/bin/sh` fallback

### 3. Container Actions Integration (`src/docker/containerActions.js`)

- **Before:** 4 copy-pasted cleanup blocks (~80 lines of duplicated logic)
- **After:** Single `registry.forceKillSession()` call per action
- Covers: stop, restart, remove, pause

### 4. Graceful Shutdown (`src/index.js`)

- SIGTERM/SIGINT handler awaits `registry.terminateAllSessions()` before closing server
- `closeWebSocketServer()` is now async with registry integration

### 5. WebSocket Server (`src/websocket/ws.js`)

- Passes `userId` from JWT to exec handler
- Async `closeWebSocketServer()` with `terminateAllSessions("server_shutdown")`

### 6. Deleted: `src/websocket/sessionManager.js`

- Fully replaced by `execSessionRegistry.js`
- Zero remaining references in codebase

### 7. Frontend Terminal (`ContainerTerminal.tsx`)

- **Terminate Button:** Power icon (⏻) in terminal header to manually kill session
- **Idle Countdown:** Amber badge shows remaining seconds when < 60s, red when < 30s
- **Termination Overlay:** Displays reason-specific message with Close/Reconnect buttons
- **Input Disabled:** `disableStdin = true` after session ends
- **StrictMode Fix:** Deferred WebSocket creation via `setTimeout(0)` to prevent console errors
- **Safe Dispose:** Try/catch guards prevent xterm crash on close

---

## 🏗️ Architecture

### Session State Machine

```
active → terminating → closed
```

- **active** — Session is live, I/O happening, idle timer running
- **terminating** — Cleanup in progress (sends termination message, destroys stream)
- **closed** — Fully cleaned up, metrics decremented, removed from registry

### Termination Reasons

| Reason                | Trigger                                  |
| :-------------------- | :--------------------------------------- |
| `idle_timeout`        | No I/O for 5 minutes                     |
| `container_stopped`   | Container stopped while session active   |
| `container_removed`   | Container removed while session active   |
| `container_paused`    | Container paused while session active    |
| `container_restarted` | Container restarted while session active |
| `server_shutdown`     | Backend SIGTERM/SIGINT received          |
| `manual_termination`  | User clicks "Terminate Session" button   |
| `stream_ended`        | Shell process exited                     |
| `client_disconnected` | Browser tab closed                       |

---

## 🧪 Verification

| Test Case                      | Result                                      |
| :----------------------------- | :------------------------------------------ |
| **Shell Connects**             | ✅ Bash preferred, sh fallback works         |
| **Terminate Button**           | ✅ Overlay with "Manually Terminated" reason |
| **Container Stop Mid-Session** | ✅ Overlay with "Container Stopped" reason   |
| **Idle Timeout**               | ✅ Countdown visible, auto-terminates at 0   |
| **Close Terminal (No Crash)**  | ✅ No xterm dispose errors in console        |
| **StrictMode Error**           | ✅ Eliminated via deferred WS creation       |
| **Metrics Accuracy**           | ✅ `activeExecSessions` = 0 after all closed |
| **Reconnect**                  | ✅ Fresh session opens cleanly from overlay  |

---

## 📅 What's Next? (Day 41)

### Day 41 — Failure Intelligence Engine v2

**Focus:** Signature Feature

**Backend:**
- Crash loop detection
- OOM detection
- Port conflict detection
- Permission error detection
- Failure classification enum: `CONFIG_ERROR`, `RESOURCE_EXHAUSTION`, `PORT_CONFLICT`, `UNKNOWN`
- Cache analysis results

**Frontend:**
- Failure summary card
- Confidence score visualization
- Evidence panel
- Timeline of failures

✅ **Outcome:** DevOpsEase becomes advisory, not reactive.
