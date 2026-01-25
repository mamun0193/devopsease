# Day 18 — API Integration & Real-Time Failure Analysis (DevOpsEase)

## 🎯 Goal
Integrate the Day 17 failure detection and analysis system into API endpoints so real container data automatically flows through the intelligence pipeline.

## ✅ What Was Added

### 1. Container Analysis Service (`server/src/services/containerAnalysis.service.js`)
**New file** — Central orchestration service that wires Day 17 intelligence into the data pipeline.

#### Key Features:
- **Container Inspection** — Fetches live container state and metadata via Docker API
- **Log Retrieval** — Pulls last 200 lines of stdout/stderr logs
- **Signal Collection** — Runs Day 17 signal detectors on container data
- **Failure Classification** — Maps signals to failure categories
- **Explanation Generation** — Creates human-readable analysis
- **Error Handling** — Gracefully handles missing logs or unavailable data

#### Function: `analyzeContainer(containerId)`
```javascript
export async function analyzeContainer(containerId)
```

**Input:**
- `containerId` — Docker container ID (required)

**Output:**
```javascript
{
  containerId,           // Container ID
  containerName,         // Friendly container name
  state,                 // Current state (running/exited/etc)
  failure,               // Classified failure from Day 16 taxonomy
  explanation            // Human-readable explanation from Day 17
}
```

---

### 2. Analysis Routes (`server/src/routes/analysis.routes.js`)
**New file** — HTTP endpoint to trigger container analysis.

#### Endpoint: `GET /containers/:id/analysis`

**Request:**
```http
GET /containers/c9ee0505c502/analysis
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "containerId": "c9ee0505c502",
    "containerName": "/redis",
    "state": "exited",
    "failure": {
      "category": "RESOURCE",
      "stage": "RUN",
      "confidence": "high"
    },
    "explanation": {
      "summary": "Container ran out of system resources",
      "confidence": "high",
      "explanation": "The container was killed due to out-of-memory condition...",
      "likelyCauses": ["Memory leak in application", "..."],
      "suggestedChecks": ["Check application memory usage", "..."],
      "signalsObserved": ["OOM_KILLED", "OOM_STATE"]
    }
  },
  "message": "Container analysis completed successfully"
}
```

**Error (400/500):**
```json
{
  "success": false,
  "error": "Container not found or analysis failed"
}
```

---

### 3. Route Registration (`server/src/index.js`)
**Modified** — Added analysis routes to main Express app.

```javascript
import analysisRoutes from './routes/analysis.routes.js';

// ... existing code ...

// Routes
app.use(analysisRoutes);      // ← NEW: Analysis routes
app.use("/health", healthRoutes);
app.use("/containers", containersRoutes);
```

**Route priority:** Analysis routes are registered first so they take precedence.

---

### 4. Test Pipeline (`server/sandbox/testAnalysisPipeline.js`)
**New file** — Integration test that validates the complete analysis pipeline.

```bash
cd server
node sandbox/testAnalysisPipeline.js
```

**What it tests:**
- ✅ Connects to Docker
- ✅ Inspects a container
- ✅ Collects signals
- ✅ Classifies failures
- ✅ Generates explanations
- ✅ Returns complete analysis result

---

## 🔑 Complete Data Flow

```
HTTP Request
    ↓
GET /containers/:id/analysis
    ↓
analyzeContainer(id)
    ↓
├→ Docker.inspect()          [Get live container state]
├→ Container.logs()          [Get recent logs]
├→ collectSignals()          [Day 17: Detect signals]
├→ classifyFailure()         [Day 17: Classify failure]
└→ explainFailure()          [Day 17: Generate explanation]
    ↓
HTTP Response (200/500)
```

---

## 🧪 Testing

### 1. Unit Test (Pipeline Integration)
```bash
cd server
node sandbox/testAnalysisPipeline.js
```

### 2. E2E Test (Full API)
```bash
# Terminal 1: Start server
cd server
npm start

# Terminal 2: Call API
curl http://localhost:4000/containers/c9ee0505c502/analysis
```

### 3. Manual Testing
```powershell
# List containers
docker ps -a

# Run analysis on a container
curl http://localhost:4000/containers/<container-id>/analysis
```

---

## 📊 What Now Works

✅ **Real-Time Analysis**
- Container failures are analyzed on-demand via API
- No manual setup required—just call the endpoint

✅ **Complete Intelligence**
- Signals from Day 17 flow into API responses
- Classifications and explanations are API-ready

✅ **Error Handling**
- Graceful fallbacks for missing data
- Proper HTTP status codes and error messages

✅ **Production Ready**
- Service is middleware-compatible
- Can be integrated into existing routes/pipelines

---

## 🔗 Architecture Overview

```
API Layer
├── analysisRoutes.js        [HTTP endpoint]
│
Service Layer
├── containerAnalysis.service.js  [Orchestration]
│
Intelligence Layer
├── signals/                 [Day 17: Signal detection]
├── classifier.js            [Day 17: Classification]
└── explainer.js             [Day 17: Explanation generation]
```

---

## 📚 Summary

**Day 18 connects the dots** between Day 17's failure intelligence and real-world API usage:

- 🎯 **Service** wraps Day 17 logic
- 🎯 **Routes** expose it over HTTP
- 🎯 **Integration** is automatic and transparent
- 🎯 **Testing** validates end-to-end flow

**Users can now request container analysis and get detailed failure explanations instantly.**

---

## 🚀 Next Steps

→ **Day 19:** Multi-container analysis, batch operations, and performance optimization
