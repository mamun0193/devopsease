# DevOpsEase – Day 21

## Goal of Day 21
Enhance container log fetching with advanced filtering, timestamps, and structured parsing. Make logs more useful by adding timestamps, levels, and statistics so the frontend can display them beautifully.

---

## What I Built

### 1. Advanced Log Fetching
Enhanced the Docker log retrieval to support:
- **Timestamp filtering** — Get logs from a specific time range using Unix timestamps
- **Tail control** — Fetch last N lines (customizable, default 500)
- **Raw timestamps** — Always include Docker timestamps in logs

Before: Simple log fetch with last 100 lines
After: Flexible log fetching with time-based filtering

### 2. Log Parser Service
Created `logParser.service.js` — A new service that takes raw Docker logs and makes them structured and useful:
- Extracts timestamps from each log line
- Detects log levels (ERROR, WARN, INFO, DEBUG)
- Recognizes error patterns (ECONNREFUSED, timeouts, etc.)
- Calculates statistics (error count, error rate, top errors)
- Provides human-readable explanations for common errors

### 3. Enhanced Logs Endpoint
Modified `GET /containers/:id/logs` to:
- Accept query parameters: `tail`, `since`, `until`
- Parse raw logs using the new logParser service
- Return three formats of data:
  - **raw** — Original Docker logs (text)
  - **parsed** — Structured log entries with timestamps, levels, messages
  - **stats** — Error counts, error rate, top errors

### 4. Exit Code Analysis Integration
Updated container inspection to:
- Analyze exit codes with signal detection
- Include `exitCodeReason` in inspect response
- Help frontend understand why a container exited

### 5. CORS Support
Added `cors` package to dependencies for frontend communication.

---

## Key Changes Made

### Backend Changes

#### 1. `server/package.json`
```diff
+ Added: "cors": "^2.8.6"
```
Enables frontend to make requests to backend from different origins.

#### 2. `server/src/docker/containers.js`
Enhanced log fetching function:
```javascript
// Before: Fixed tail value
async function getContainerLogs(id) {
  const logs = await container.logs({
    stdout: true,
    stderr: true,
    tail: 100,
  });
}

// After: Flexible with timestamps and filtering
async function getContainerLogs(id, options = {}) {
  const { tail = 500, since, until } = options;
  const logOptions = {
    stdout: true,
    stderr: true,
    tail: tail,
    timestamps: true, // Always include Docker timestamps
  };
  
  if (since) logOptions.since = since;
  if (until) logOptions.until = until;
  
  const logs = await container.logs(logOptions);
  return logs.toString();
}
```

**Why?**
- `timestamps: true` — Docker includes ISO timestamps in each line
- `since/until` — Filter logs by time range (Unix timestamps)
- `tail` — Configurable number of lines to fetch

#### 3. `server/src/routes/containers.routes.js`
Updated logs endpoint to use new features:
```javascript
// Before: Just return raw logs
router.get("/:id/logs", async (req, res, next) => {
  const logs = await getContainerLogs(req.params.id);
  res.status(200).json({
    success: true,
    data: logs,
    message: "Container logs retrieved successfully",
  });
});

// After: Parse logs and return multiple formats
router.get("/:id/logs", async (req, res, next) => {
  const { tail, since, until } = req.query;
  const options = {
    tail: tail ? parseInt(tail, 10) : 500,
    since: since ? parseInt(since, 10) : undefined,
    until: until ? parseInt(until, 10) : undefined,
  };
  
  const rawLogs = await getContainerLogs(req.params.id, options);
  const { logs, stats } = parseLogs(rawLogs);
  
  res.status(200).json({
    success: true,
    data: {
      raw: rawLogs,
      parsed: logs,
      stats: stats
    },
    message: "Container logs retrieved successfully",
  });
});
```

**What changed:**
- Extract query parameters for filtering
- Pass options to log fetcher
- Parse raw logs with new service
- Return structured data for frontend

#### 4. `server/src/services/containerInspect.service.js`
Added exit code analysis:
```javascript
// Before: Just return exit code number
state: {
  status: inspectData.State?.Status,
  exitCode: inspectData.State?.ExitCode,
}

// After: Include the reason
state: {
  status: inspectData.State?.Status,
  exitCode: exitCode,
  exitCodeReason: exitAnalysis?.reason || null,
}
```

This helps frontend know WHY a container exited (OOM killed, non-zero exit, etc.)

#### 5. `server/src/services/logParser.service.js` (NEW FILE)
Created complete log parsing service with:
- Timestamp extraction and formatting
- Log level detection (ERROR, WARN, INFO, DEBUG)
- Pattern recognition (common errors, URLs, IPs)
- Statistics calculation
- Human-readable error explanations

---

## Technical Improvements

### Before Day 21:
- Logs endpoint returned plain text
- No structured data for frontend
- Hard to search, filter, or analyze logs
- No statistics on errors

### After Day 21:
- Logs endpoint returns parsed, structured data
- Frontend can display formatted logs with levels
- Time-range filtering works
- Error statistics show what's wrong
- Exit codes include explanations

---

## API Changes

### Updated Endpoint: `GET /containers/:id/logs`

**Query Parameters:**
- `tail` — Number of lines to fetch (default: 500)
- `since` — Unix timestamp (start time)
- `until` — Unix timestamp (end time)

**Examples:**
```bash
# Get last 100 lines
curl http://localhost:4000/containers/abc123/logs?tail=100

# Get logs from last 24 hours
curl "http://localhost:4000/containers/abc123/logs?since=1704067200&until=1704153600"

# Get last 50 lines
curl http://localhost:4000/containers/abc123/logs?tail=50
```

**Response:**
```json
{
  "success": true,
  "data": {
    "raw": "2026-02-01T10:30:45.123Z stdout P Error: connection refused...",
    "parsed": [
      {
        "timestamp": "2026-02-01T10:30:45.123Z",
        "stream": "stdout",
        "level": "ERROR",
        "message": "Error: connection refused"
      }
    ],
    "stats": {
      "total": 150,
      "errors": 12,
      "warnings": 8,
      "info": 130,
      "errorRate": "8%",
      "topErrors": [
        { "message": "ECONNREFUSED", "count": 5 },
        { "message": "ETIMEDOUT", "count": 3 }
      ]
    }
  },
  "message": "Container logs retrieved successfully"
}
```

---

## How It Works

```
Raw Docker Logs (text)
    ↓
logParser.service.js
    ├─ Extract timestamps
    ├─ Detect error/warn/info levels
    ├─ Recognize patterns
    └─ Calculate statistics
    ↓
Three formats returned:
├─ raw: Original text (for reference)
├─ parsed: Structured array (for display)
└─ stats: Aggregated data (for dashboard)
    ↓
Frontend receives clean, structured data
```

---

## Problems Faced & Fixed

### 1. Docker Timestamps
**Problem:** Docker logs include timestamps, but they need to be extracted and standardized.
**Solution:** Set `timestamps: true` in log options, then parse in logParser service.

### 2. Time-Range Filtering
**Problem:** How to filter logs by time without fetching all logs?
**Solution:** Docker API supports `since` and `until` parameters (Unix timestamps). Frontend can calculate these.

### 3. Exit Code Context
**Problem:** Just seeing exit code 137 isn't helpful.
**Solution:** Reuse signal detection logic to explain why container exited (e.g., "OOM killed").

### 4. Error Statistics
**Problem:** Frontend needs to know error frequency, not just individual errors.
**Solution:** Parser calculates error count, rate, and identifies top errors.

---

## Key Takeaways

- **Logs are data** — Parse them into structured format, not just display as text
- **Timestamps matter** — Time filtering enables better debugging
- **Statistics help** — Show error rates and patterns, not just raw errors
- **Reuse logic** — Exit code analysis leverages existing signal detection
- **Frontend-friendly** — Multiple formats let frontend choose what it needs

---

## Testing It Out

```bash
# Make sure backend is running
cd server && npm start

# Fetch parsed logs in a new terminal
curl http://localhost:4000/containers/<container-id>/logs

# Fetch with custom tail
curl "http://localhost:4000/containers/<container-id>/logs?tail=200"

# Fetch from specific time range
curl "http://localhost:4000/containers/<container-id>/logs?since=1704067200"
```

---

## Next Steps (Day 22 Plan)

Day 22 will build the frontend to display these beautiful parsed logs:
- Create LogViewer component
- Show parsed logs with color-coding by level
- Add search and filter controls
- Display error statistics
- Real-time log updates

DevOpsEase is now halfway to a complete DevOps dashboard! 🎉

