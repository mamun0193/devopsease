# Day 29: Real-Time Container Terminal

## 🎯 Objective

Implement a fully functional, real-time **terminal interface** for running containers. This allows users to execute commands directly inside containers via the web UI, leveraging **WebSockets** for low-latency bidirectional communication and the **Docker Exec API**.

---

## ✅ What Was Built

### 1. WebSocket Infrastructure
**Backend** (`server/src/websocket/`):
- **WebSocket Server** (`ws.js`): Intercepts HTTP upgrades on `/ws/exec/:id` and establishes persistent connections.
- **Session Manager** (`sessionManager.js`):
  - Enforces **singleton sessions** (one active terminal per container).
  - Handles session preemption (new connection steals control).
  - Tracks active streams for robust cleanup.

### 2. Docker Exec Orchestration

**Backend** (`execHandler.js`):

- **Shell Detection**: Automatically tries `/bin/bash`, `/bin/sh`, then `sh` to find a compatible shell.
- **Stream Piping**: Connects the WebSocket stream ensuring `stdin`, `stdout`, and `stderr` are correctly routed.
- **Terminal Sizing**: Syncs frontend terminal dimensions (`rows`, `cols`) with the backend TTY to prevents formatting issues.
- **State Validation**: Rejects connections to stopped/paused containers.

### 3. Interactive Terminal UI

**Frontend** (`ContainerTerminal.tsx`):

- **XTerm.js Integration**: Industry-standard terminal emulator with custom styling (Dracula-esque theme).
- **Fit Addon**: Automatically resizes text to fill the viewport.
- **Connection States**: Visual feedback for `Connecting`, `Connected`, `Disconnected`, and `Error`.
- **Minimized Mode**: Allows keeping the terminal open in the corner while managing other containers.

---

## 📊 Architecture Impact

**New Files:**

| File                                             | Purpose                                           |
| ------------------------------------------------ | ------------------------------------------------- |
| `server/src/websocket/ws.js`                     | WebSocket server setup & upgrade handling         |
| `server/src/websocket/execHandler.js`            | Docker exec creation, stream piping, and resizing |
| `server/src/websocket/sessionManager.js`         | In-memory tracking of active exec sessions        |
| `dashboard/src/components/ContainerTerminal.tsx` | React component wrapping XTerm.js                 |

**Key Features:**

1.  **Smart Shell Auto-discovery**:
    *   Tries `/bin/bash` -> `/bin/sh` -> `sh`.
    *   Sets up `TERM=xterm-256color` and color prompts strings.

2.  **Robust Lifecycle Management**:
    *   **Preemption**: If you open the terminal in a new tab, the old one disconnects cleanly.
    *   **Cleanup**: ensuring Docker exec streams are destroyed when the WebSocket closes.

3.  **UX Polish**:
    *   **Toast Notifications**: User alerted on connection success/failure.
    *   **Scroll Lock**: "New output" button appears when scrolling up.
    *   **Backdrop Blur**: Modal styling matches the glassmorphism aesthetic.

---

## 🧠 Key Decisions

1.  **WebSockets vs HTTP Polling**:
    *   Exec needs a continuous stream for `stdin`/`stdout`. HTTP overhead would be too high and laggy. WebSockets provide the "live" feel required.
    
2.  **Singleton Sessions**:
    *   To avoid "ghost inputs" or race conditions, we enforce one active web terminal per container. New connections preempt old ones.

3.  **Client-Side Rendering (XTerm.js)**:
    *   Offloads rendering to the browser. The server just pipes raw text/bytes. This keeps the backend lightweight.

4.  **Auto-Resize Sync**:
    *   The frontend detects window resize, fits the terminal, and sends dimensions to the backend. The backend updates the Docker exec instance TTY size. This ensures `top`, `htop`, and long lines render correctly.

---

## 🛠️ Tech Stack

- **Backend**: `ws` (Node.js WebSocket lib), `dockerode` (Exec API)
- **Frontend**: `xterm.js`, `xterm-addon-fit`, `lucide-react` (icons)
- **Protocol**: Raw text over WebSocket (JSON for control messages like `resize` or `handshake`)

---

## 🧪 Testing

✅ **Shell Access**:
- Connect to Alpine (uses `/bin/sh`) -> Success.
- Connect to Ubuntu (uses `/bin/bash`) -> Success.

✅ **Resilience**:
- Stop container while terminal is open -> Connection closes with error.
- Pause container -> Connection rejected.
- Network disconnect -> UI shows "Disconnected" overlay with Reconnect button.

✅ **Features**:
- Run `top` -> Updates in real-time.
- Resize window -> Text reflows correctly.
- Minimize terminal -> Continues running in background.

---

## 🚀 What's Next: Day 30 — Finalization & Production Readiness

- **Minimal RBAC**: Viewer (read-only) vs Operator (full control) roles
- **Destructive Action Guards**: Disable start/stop/exec/remove for viewers (API + UI)
- **Defensive State Checks**: Validate container state before actions (no crashes)
- **Error Consistency**: Unified error formatting and notifications
- **UX Polish**: Empty states, loading indicators, and graceful failures


---

## ✅ Success Criteria

- [x] WebSocket server handling specific `/ws/exec/:id` routes.
- [x] Secure session management (no orphaned exec instances).
- [x] Fully responsive terminal UI with minimize capability.
- [x] Bi-directional communication (typing works, output appears).
- [x] accurate resizing of the remote TTY.
