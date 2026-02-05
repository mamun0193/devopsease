# DevOpsEase – Day 25: Container Stats & Resource Usage

---

## Goal of Day 25
Expose **real-time, explainable container resource usage** so users can understand why a container is slow, unstable, or crashing before taking action.

---

## What Was Built

### Backend Implementation

#### 1. Container Stats Service (`containerStats.service.js`)
Core service handling Docker stats API integration:

**CPU Calculation Strategy:**
- Uses delta-based computation between consecutive reads
- Accounts for system CPU time and number of CPU cores
- Maintains previous stats in memory for accurate delta calculation
- Falls back to precpu_stats when no previous reading exists

```javascript
CPU % = (cpuDelta / timeDelta / 1e9) * numCPUs * 100
```

**Memory Calculation:**
- Subtracts cache from usage for accurate "used" memory
- Converts bytes to MB for readability
- Calculates percentage based on container limit

**Network Calculation:**
- Aggregates RX/TX across all network interfaces
- Cumulative totals since container start
- Converted to MB with 2 decimal precision

**Error Handling:**
- Returns 400 if container not running
- Returns 404 if container not found
- Never exposes raw Docker errors to frontend

---

#### 2. Stats Endpoint
```
GET /containers/:id/stats
```

**Response Format:**
```json
{
  "success": true,
  "data": {
    "cpu": { "usagePercent": 42.8 },
    "memory": {
      "usedMB": 192,
      "limitMB": 512,
      "usagePercent": 37.5
    },
    "network": {
      "rxMB": 18.2,
      "txMB": 9.6
    }
  },
  "message": "Container stats retrieved successfully"
}
```

---

### Frontend Implementation

#### 1. API Integration (`api/index.ts`)
- Added `ContainerStats` TypeScript interface
- New `containerApi.stats()` method
- Automatic response parsing and error handling

#### 2. React Query Hook (`useContainerStats`)
**Polling Configuration:**
- Refetch interval: **3 seconds** (balances freshness vs load)
- Only polls when container is running
- Stops automatically when container stops or is deselected
- Stale time: 1 second (treats data as fresh briefly)

**Why Not WebSockets?**
- Simpler implementation
- No connection management overhead
- Sufficient for read-only dashboard
- Easy to debug and maintain

#### 3. Stats Panel Component (`ContainerStatsPanel.tsx`)
**Features:**
- CPU usage with gradient progress bar (purple/pink)
- Memory usage with current/limit and progress bar (blue/cyan)
- Network I/O (RX/TX) in MB
- Auto-refresh indicator
- Manual refresh button
- Loading, error, and empty states

**UX Decisions:**
- Numbers + progress bars (no charts) for clarity
- Prominent display of percentages for at-a-glance understanding
- Graceful handling when container stops mid-polling
- Non-blocking UI during refresh

---

## Technical Design Decisions

### Why Polling Over Streaming?
1. **Simplicity** - No WebSocket infrastructure needed
2. **Reliability** - HTTP is stateless and fault-tolerant
3. **Sufficient** - 3-second intervals adequate for observability
4. **Browser-friendly** - Works with all browsers, no connection limits

### Why Delta-Based CPU Calculation?
Docker stats returns cumulative CPU time. To get current usage:
1. Store previous `cpu_stats.cpu_usage.total_usage`
2. Calculate delta between current and previous
3. Divide by elapsed time to get usage rate
4. Multiply by CPU count to get percentage

This approach is standard in Docker tools and provides accurate real-time usage.

### Why Not Historical Data?
- Scope: Day 25 is **observability**, not monitoring
- Complexity: Time-series storage adds significant overhead
- Alternative: Users can integrate Prometheus/Grafana later
- Focus: Help users make immediate decisions

---

## Polling Lifecycle

### Start Conditions
- Container selected
- Container is running
- Component mounted

### Stop Conditions
- Container deselected
- Container stops
- User navigates away
- Component unmounts

React Query automatically manages cleanup - no memory leaks.

---

## Integration Points

### ContainerInfo Component
Stats panel appears at the top of the Info tab, above "Basic Information" section.

**Why in Info Tab?**
- Logical grouping with technical details
- Doesn't clutter main container list
- User explicitly opts in by viewing Info

---

## Error Handling

### Backend Errors
- Container not running → 400 + user-friendly message
- Container not found → 404
- Docker failure → 500 (logged server-side)

### Frontend Errors
- Network failure → Shows error with retry button
- Timeout → React Query retries automatically
- Invalid data → Falls back to loading state

---

## Performance Considerations

### Backend
- Stats calculation is O(1) - constant time
- previousStats Map grows with unique container IDs
- No database queries
- Minimal CPU overhead

### Frontend
- React Query caches responses
- Only one active poll per container
- Automatic request deduplication
- Component unmounting stops polling

---

## Not Implemented (By Design)

**Alerts & Thresholds** - Out of scope  
**Historical Charts** - Use Grafana  
**Disk I/O** - Not exposed by Docker stats  
**Per-process stats** - Container-level only  
**Export/Download** - Observability tool, not reporting  

---

## What's Next

**Day 26: Operation History & Timeline**

Expose a chronological view of container actions so users can understand cause → effect relationships and debug operational issues.

**What Day 26 Will Add:**

1. **Operation History (Backend)** - Read-only list of actions (start/stop/restart/remove) with timestamp, container id/name, success/failure status, and brief reason from logs

2. **Timeline View (Frontend)** - Chronological UI showing actions in order with visual distinction for success vs failure and action type. Think "Git log, but for container operations"

3. **Correlation (Key Value)** - From the timeline, users can jump to logs around an action, see stats shortly after an action, and understand cause → effect relationships

No automation. No editing history. Just truthful sequencing.

---

## Summary

Day 25 delivers **actionable resource visibility**:

✅ Real-time CPU, memory, network stats  
✅ Auto-refreshing every 3 seconds  
✅ Clean, gradient-based progress bars  
✅ Only shown for running containers  
✅ Graceful error handling  
✅ Non-blocking polling architecture  
✅ Manual refresh option  

**Users can now answer:**
- "Is my container using too much CPU?"
- "Is it running out of memory?"
- "How much network traffic is it generating?"

**Before acting** (restart, stop, remove), users have the data to make informed decisions.
