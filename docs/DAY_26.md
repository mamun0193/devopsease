# Day 26: Operation History & Timeline

**Date:** February 5, 2026  
**Status:** ✅ Complete

---

## 🎯 Objective

Design and implement a **read-only operation history and timeline** that answers:

> *What action happened, when it happened, on which container, and did it succeed—then what happened next?*

Enable **cause → effect analysis** by correlating actions with logs and stats—providing clear observability into the operational timeline of containers.

---

## ✅ What Was Built

### Backend: Action History Service

#### **Source of Truth**
- In-memory action history store (`actionHistory.service.js`)
- Append-only semantics with stable ordering (newest → oldest)
- Automatic recording via enhanced container actions

#### **Action Record Model**
```javascript
{
  id: "uuid",
  timestamp: "2026-02-05T10:30:00.000Z",
  container: {
    id: "abc123def456",
    name: "my-app"
  },
  action: "start" | "stop" | "restart" | "remove",
  status: "success" | "failed",
  reason: "Started from exited state",
  source: "user" | "system"
}
```

#### **API Endpoints**
- `GET /actions` - List all actions
- `GET /actions?containerId=<id>` - Filter by container
- `GET /actions?limit=50&cursor=<id>` - Paginated results
- `GET /actions/:id` - Get specific action
- `GET /actions/stats` - Summary statistics

#### **Implementation Details**
1. **Service Layer** (`actionHistory.service.js`)
   - In-memory array with max 1000 entries
   - Automatic cursor-based pagination
   - Statistics aggregation (total/success/failed counts)
   - Thread-safe unshift for newest-first ordering

2. **Integration** (`containerActions.js`)
   - Every container action (start/stop/restart/remove) records history
   - Success AND failure cases captured
   - Contextual reason strings (e.g., "Started from exited state", error messages)
   - Automatic logging with structured event metadata

3. **Routes** (`actions.routes.js`)
   - Validation: limit between 1-200
   - Cursor continuation using action IDs
   - Standard API response format

---

### Frontend: Timeline UI

#### **Component Architecture**
- `Timeline.tsx` - Main timeline component with expand/collapse
- Integrated into `ContainerDetailsPage` as "History" tab
- Visual distinction for action types and status

#### **Visual Design**
```
┌─────────────────────────────────────────────┐
│ Timeline Entry                              │
├─────────────────────────────────────────────┤
│ [Icon] Action • Container Name              │
│        2 minutes ago                        │
│                                             │
│ ▼ Expanded Details:                        │
│   Container: abc123def456                   │
│   Source: user                              │
│   Reason: Restarted from running state      │
│                                             │
│   [View logs around this time]              │
│   [View current stats]                      │
└─────────────────────────────────────────────┘
```

#### **Action Iconography**
- **Start**: Play circle (emerald green)
- **Stop**: Stop circle (amber yellow)
- **Restart**: Rotate (blue)
- **Remove**: Trash (red)
- **Success**: Check circle badge
- **Failed**: X circle badge (always red regardless of action)

#### **State Management**
- React Query for data fetching (`useActions` hook)
- Local expand/collapse state
- No polling (read-only, user-initiated refresh only)

---

## 🔗 Correlation Implementation

### **Mental Model**
> "From the timeline, jump to exactly when/where it matters."

### **Correlation Points**

#### **1. View Logs Around Action**
```typescript
const handleViewLogsFromTimeline = (containerId: string, timestamp: string) => {
  const actionTime = new Date(timestamp).getTime() / 1000;
  const since = actionTime - 30; // 30s before
  const until = actionTime + 90; // 90s after
  
  setLogTimeFilter({ since, until });
  setActiveTab('logs');
};
```

**Design Decision:**  
- **30 seconds before**: Capture pre-action state
- **90 seconds after**: Allow time for effects to manifest
- Automatically activates time range filter in LogViewer
- User sees logs centered on the action time

#### **2. View Stats After Action**
```typescript
const handleViewStatsFromTimeline = () => {
  setActiveTab('info'); // Stats panel is in Details tab
};
```

**Design Decision:**  
- Navigate to Info tab where ContainerStatsPanel lives
- Shows current stats (if container is running)
- User correlates current resource usage with past actions

---

## 🧠 Design Decisions

### **1. In-Memory Storage vs Persistent Storage**

**Decision:** In-memory with 1000-action cap

**Reasoning:**
- Sufficient for demo and immediate operational visibility
- No database dependency
- Actions auto-rotate (oldest dropped beyond limit)
- Production systems would use persistent storage (DB, logs)

**Tradeoff:**
- ❌ Lost on server restart
- ✅ Zero latency, zero complexity
- ✅ Sufficient for Day 26 scope

---

### **2. Cursor-Based Pagination**

**Decision:** Use action ID as opaque cursor

**Reasoning:**
- Stable ordering (actions never change position)
- Simple client implementation
- No offset drift issues

**Implementation:**
```javascript
const cursorIndex = actions.findIndex(a => a.id === cursor);
const items = actions.slice(cursorIndex + 1, cursorIndex + 1 + limit);
```

**Tradeoff:**
- ❌ Requires client to store cursor
- ✅ Stable across updates
- ✅ No page-number pagination bugs

---

### **3. No Real-Time Updates**

**Decision:** Read-only, manual refresh only

**Reasoning:**
- Scope constraint: no WebSockets
- History is inherently static
- Users control when to refresh
- Reduces complexity

**Alternatives Considered:**
- Polling every 10s → rejected (overkill for history)
- WebSocket streaming → rejected (out of scope)

---

### **4. Correlation Time Windows**

**Decision:** -30s / +90s around action

**Reasoning:**
- 30s before: Capture immediate pre-action state
- 90s after: Allow effects to fully manifest (restart cycles, health checks)
- Asymmetric window favors post-action observation

**Example:**
```
Action at 10:30:00
Logs from 10:29:30 → 10:31:30
```

---

### **5. Success/Failure Recording**

**Decision:** Record both success AND failure

**Reasoning:**
- Failures are signal (user needs to know what happened)
- Success actions provide operational context
- Timeline completeness enables pattern recognition

**Implementation:**
```javascript
try {
  await container.start();
  recordAction({ status: 'success', reason: '...' });
} catch (error) {
  recordAction({ status: 'failed', reason: error.message });
}
```

---

## 📊 API Response Format

### **List Actions**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "timestamp": "2026-02-05T10:30:00.000Z",
        "container": {
          "id": "abc123def456",
          "name": "my-app"
        },
        "action": "restart",
        "status": "success",
        "reason": "Restarted from running state",
        "source": "user"
      }
    ],
    "nextCursor": "550e8400-e29b-41d4-a716-446655440001"
  },
  "message": "Action history retrieved successfully"
}
```

### **Action Stats**
```json
{
  "success": true,
  "data": {
    "total": 42,
    "success": 38,
    "failed": 4
  },
  "message": "Action history stats retrieved successfully"
}
```

---

## 🛠️ Technical Stack

### **Backend**
- Node.js with ES modules
- Express routing
- In-memory JavaScript array
- UUID for action IDs

### **Frontend**
- React 19 with TypeScript
- React Query for data fetching
- Lucide icons for visual distinction
- Framer Motion for expand animations (optional)
- date-fns for timestamp formatting

---

## 🧪 UX Details

### **Empty States**
- No history yet: Clear message, no action required
- No actions for container: Contextual message

### **Error States**
- API failure: Red alert with error message
- Network timeout: User can retry via refresh

### **Loading States**
- Spinner with "Loading history..." message
- Non-blocking (doesn't prevent navigation)

### **Expand/Collapse**
- Single-select (only one action expanded at a time)
- Chevron indicator (right → down)
- Details shown: Container ID, source, reason, correlation buttons

---

## 📈 Future Enhancements (Not in Day 26)

1. **Persistent Storage**
   - Store actions in SQLite/PostgreSQL
   - Survive server restarts
   - Query by date range, action type, etc.

2. **System Actions**
   - Record auto-restarts (from restart policies)
   - Record health check failures
   - Distinguish user vs system source

3. **Bulk Operations**
   - Timeline entry for "stopped 5 containers"
   - Expand to show individual actions

4. **Export**
   - Download history as JSON/CSV
   - Audit trail for compliance

5. **Advanced Filtering**
   - Filter by action type (only restarts)
   - Filter by status (only failures)
   - Search by container name

6. **Real-Time Updates**
   - WebSocket streaming of new actions
   - Live timeline updates

---

## ✅ Success Criteria Met

- [x] Backend action history extraction (in-memory store)
- [x] Read-only API to fetch action history
- [x] Frontend timeline UI with visual distinction
- [x] Correlation links to logs and stats
- [x] Newest → oldest ordering
- [x] Cursor-based pagination
- [x] Success/failure indication
- [x] Human-readable timestamps
- [x] Expand-on-click details
- [x] No polling or live updates
- [x] Clear empty and error states

---

## 🚀 What's Next: Day 27

**Introduce Redis-Backed Caching**

- Add Redis via Docker Compose with persistence enabled
- Implement cache-aside pattern for container state and metadata
- Apply tiered TTLs and request deduplication
- Reduce excessive Docker API calls
- Make Redis optional with graceful fallback
- Add cache invalidation on container lifecycle actions
- Migrate action history to Redis (preserve across restarts)

---

## 🎓 Lessons Learned

1. **In-memory is sufficient for many use cases**  
   Don't over-engineer persistence when observability needs are immediate and short-term.

2. **Correlation is more valuable than raw data**  
   Timeline + logs + stats = understanding. Each alone is incomplete.

3. **Cursor pagination > offset pagination**  
   Stable, predictable, no drift bugs.

4. **Both success and failure matter**  
   Success provides operational context. Failures are debugging signal.

5. **Time windows should favor aftermath**  
   Most diagnostics happen post-action, so asymmetric windows (-30s/+90s) make sense.

---

## 📚 References

- RFC 7807: Problem Details for HTTP APIs
- Git log UX: inspiration for timeline design
- GitHub Actions timeline: visual language reference
- date-fns formatting: `formatDistanceToNow()` for relative timestamps

---

**Day 26 Complete.** 🎉  
Operation history now provides clear, correlatable observability into container actions.
