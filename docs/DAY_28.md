# Day 28: Container Actions & Error Resilience

## 🎯 Objective

Extend container management with **pause/unpause actions**, **container creation**, **global error handling**, and **server readiness checks**.

---

## ✅ What Was Built

### 1. Pause/Unpause Container Actions

**Backend** (`docker/containerActions.js`):
- `pauseContainer()` - Freezes running container (preserves memory)
- `unpauseContainer()` - Resumes paused container

**State Validation:**
- Pause: Only running containers (not paused/stopped/dead)
- Unpause: Only paused containers
- Both: Wait for state confirmation + cache invalidation

**Frontend** (`ContainerControls.tsx`):
- Unified toggle button: Shows Pause (purple) when running, Play/Unpause (emerald) when paused
- Uses distinct icons vs start/stop (Power icon)

---

### 2. Create Container Modal

**Modal Component** (`CreateContainerModal.tsx`):

| Field | Description |
|-------|-------------|
| Image Name | Required (e.g., `nginx:latest`) |
| Container Name | Optional custom name |
| Port Mappings | Dynamic add/remove, container → host |
| Environment Variables | Dynamic add/remove, KEY=value |
| Auto Start | Toggle to start immediately after creation |

**Features:**
- Animated modal with backdrop blur
- Form validation (image required)
- Loading state with spinner
- Error display within modal
- Cache invalidation on success

**Backend** (`docker/containerActions.js` - `createContainer()`):
- Auto-pulls missing images
- Validates name uniqueness
- Builds port bindings and env arrays
- Optional auto-start after creation
- Records action to history

---

### 3. Server Readiness System

**Readiness Service** (`services/readiness.service.js`):

```javascript
class ReadinessService {
  dockerReady = false;
  historyReady = false;
  
  isReady() { return dockerReady && historyReady; }
  getStatus() { return { ready, docker, history, uptime }; }
}
```

**Readiness Middleware** (`middlewares/readinessMiddleware.js`):
- Bypasses `/health` endpoints
- Returns 503 with `initializing: true` while server warms up
- Prevents clients from hitting uninitialized routes

**Benefit:** Prevents race conditions during server startup

---

### 4. Global Error Boundary

**Component** (`ErrorBoundary.tsx`):

**Catches:**
- `.toFixed()` on null (stats not ready)
- Property access on undefined
- Async render failures during initialization

**UI:**
- User-friendly error message
- "Try Again" reset button
- "Reload Page" fallback
- Stack trace in dev mode only

**Integration:** Wraps entire app in `main.tsx`

---

### 5. Safe Number Formatting

**Utilities** (`utils/numberFormat.ts`):

```typescript
formatNumber(value, decimals, { suffix, placeholder })
formatPercent(value, decimals, placeholder)
formatMB(value, decimals, placeholder)
isNumericReady(value): value is number
```

**Why not `(value ?? 0).toFixed()`?**
- Hides "data not ready" state
- 0% CPU looks like "no load" (actually means "unknown")
- Harder to debug

**Approach:** Returns em-dash (`—`) placeholder for null/undefined/NaN

---

### 6. Updated Container Controls

**Button Logic:**
- Start/Stop: Power icon, green/red colors
- Pause/Unpause: Play/Pause icons, purple/emerald colors
- Unified mode: Single toggle for start/stop
- Compact mode: Icon-only, square buttons

**State-Aware Visibility:**
- Start hidden when running
- Stop hidden when stopped
- Pause/Unpause only for running/paused states

---

## 📊 Architecture Impact

**New Files:**

| File | Purpose |
|------|---------|
| `CreateContainerModal.tsx` | Container creation form |
| `ErrorBoundary.tsx` | React error catching |
| `numberFormat.ts` | Safe numeric formatting |
| `readiness.service.js` | Server startup state |
| `readinessMiddleware.js` | 503 during initialization |

**Modified Files:**

| File | Changes |
|------|---------|
| `containerActions.js` | +pause, +unpause, +create functions |
| `containerActions.ts` | +pause, +unpause, +create API calls |
| `ContainerControls.tsx` | +pause/unpause handlers, unified button |
| `ContainerHeader.tsx` | Uses `formatNumber()` for safe rendering |
| `containersSlice.ts` | +pause/unpause/create thunks |
| `health.routes.js` | Updated readiness endpoint |

---

## 🧠 Key Decisions

1. **Pause vs Stop** - Pause preserves memory (fast resume), Stop terminates process
2. **ReadinessService** - Explicit startup tracking, not implicit boot time
3. **Error Boundary** - React class component (hooks don't catch render errors)
4. **Placeholder Strategy** - Em-dash (`—`) communicates "not ready" vs misleading zeros
5. **Unified Controls** - Single power button toggles based on current state
6. **Auto-Start Default** - Container creation starts immediately (user expectation)

---

## 🛠️ Tech Stack

**Backend:** Express middleware, Docker pause/unpause API  
**Frontend:** React class component (ErrorBoundary), Framer Motion modal  
**State:** Redux thunks for new actions

---

## 🧪 Testing

✅ Pause running container → shows paused state  
✅ Unpause paused container → resumes running  
✅ Create container with image → pulls if missing  
✅ Create with ports/env → correct bindings  
✅ Create with auto-start → immediately running  
✅ Error boundary catches null access → shows recovery UI  
✅ Server startup → 503 until ready  
✅ formatNumber(null) → returns placeholder

---

## 🚀 What's Next: Day 29

-Docker exec via Engine API
-WebSocket-backed terminal
  
---

## ✅ Success Criteria

- [x] Pause/Unpause container actions (backend + frontend)
- [x] Create container modal with image/ports/env
- [x] Image auto-pull when missing
- [x] Server readiness middleware (503 during startup)
- [x] Global ErrorBoundary preventing blank screens
- [x] Safe number formatting utilities
- [x] Unified start/stop toggle button
- [x] Distinct icons/colors for pause vs start/stop

---

**Day 28 Complete** 🎉

Container lifecycle expansion with pause/unpause, creation workflow, and crash-proof error handling.
