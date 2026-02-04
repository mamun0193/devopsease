# DevOpsEase – Day 23: Container Control Backend APIs

---

## Goal of Day 23
Implement the backend foundation for container lifecycle management — safe, state-aware APIs for start, stop, restart, and remove operations.

*(This is the first half of the container controls feature planned in Day 22. Day 24 will build the frontend UI.)*

---

## What Was Built (Backend APIs)

### 1. Container Actions Module (`containerActions.js`)
Core logic for container lifecycle operations:
- `startContainer(id)` — Start stopped containers
- `stopContainer(id)` — Graceful shutdown (10s timeout)
- `restartContainer(id)` — Atomic restart operation
- `removeContainer(id, force)` — Safe removal with force option
- `getContainerState(id)` — State inspection helper

### 2. Four REST Endpoints
```
POST   /containers/:id/start
POST   /containers/:id/stop
POST   /containers/:id/restart
DELETE /containers/:id?force=true
```

### 3. State Validation
Every operation validates container state before executing:
- Rejects invalid transitions (e.g., stopping already-stopped containers)
- Returns clear error messages
- Includes previous and current state in responses

### 4. Sandbox Testing
Tested using `sandbox/testContainerActions.js`:
- Verified state validation logic
- Confirmed proper HTTP status codes (200/400/404/500)
- Validated error messages and logging

---

## Key Learnings (Backend)

### 1. State Management is Critical
Docker containers have complex state machines. Pre-operation state checks prevent:
- Race conditions
- Confusing error messages
- Unnecessary API calls

### 2. Error Translation Matters
Raw Docker errors (`Error: (HTTP code 304)`) are developer-hostile.  
Translated errors (`Cannot start container because it is already running`) are user-friendly.

### 3. Structured Logging Enables Debugging
Context-rich logs make production troubleshooting significantly easier:
```json
{
  "level": "error",
  "message": "Failed to start container",
  "containerId": "abc123",
  "error": "OCI runtime error",
  "state": "exited"
}
```

---

## Backend Guarantees for Frontend (Day 24)

The backend provides these contracts for UI integration:

**Standardized Response:**
```json
{
  "success": true/false,
  "data": {
    "containerId": "abc123",
    "action": "restart",
    "previousState": "running",
    "currentState": "restarting"
  },
  "message": "Human-readable explanation"
}
```

**HTTP Status Codes:**
- `200` — Operation succeeded
- `400` — Invalid state transition
- `404` — Container not found
- `500` — Docker/internal error

**State Tracking:**
Responses include both previous and current states, enabling the UI to update accurately without additional API calls.

---

## What's Next: Day 24 — Frontend Container Controls UI

**Objective:** Build React UI with Redux Toolkit for container lifecycle management.

**Planned Features:**
- Action buttons for start/stop/restart/remove
- Loading states during API calls
- Confirmation dialogs for destructive actions
- Success/error toast notifications
- Optimistic UI updates with rollback on failure
- State synchronization with Redux Toolkit

**State Management (Redux Toolkit):**
- Container list slice with actions
- Async thunks for API operations
- Loading/error state tracking
- Automatic refetch after operations

**UX Considerations:**
- Disable invalid actions based on container state
- Show visual feedback for in-progress operations
- Clear error messages from backend displayed to users

---