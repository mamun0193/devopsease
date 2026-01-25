# Day 17 — Failure Detection & Intelligence (DevOpsEase)

## 🎯 Goal
Build a complete failure detection and analysis system that collects signals, classifies failures, and generates human-readable explanations.

## ✅ What Was Added

### 1. Signal Detection System (`server/src/intelligence/signals/`)
Four analyzers to detect container failure signals:

#### **exitCodes.js**
- Detects `OOM_KILLED` (exit code 137)
- Detects `NON_ZERO_EXIT` for all other non-zero codes
- Returns `null` for clean exits (code 0)

#### **containerState.js**
- Checks Docker `OOMKilled` flag → `OOM_STATE` signal
- Detects unexpected exits → `EXITED_UNEXPECTEDLY` signal
- Inspects container state metadata

#### **restartBehavior.js**
- Detects `CRASH_LOOP` (≥5 restarts, high severity)
- Detects `RESTARTED` (1-4 restarts, low severity)
- Identifies unstable containers

#### **logPatterns.js**
Pattern-matching for common errors:
- `ECONNREFUSED` → `CONNECTION_REFUSED` (network)
- `EADDRINUSE` → `PORT_IN_USE` (port conflict)
- `Cannot find module` → `MODULE_NOT_FOUND` (missing dependency)
- `UnhandledPromiseRejection` → `UNHANDLED_REJECTION` (runtime error)

#### **index.js**
Central orchestrator that runs all analyzers and returns combined signals.

---

### 2. Failure Classifier (`classifier.js`)
Maps detected signals to failure categories with confidence levels:

- **RESOURCE** → OOM signals (high priority)
- **NETWORK** → Connection/port issues
- **RUNTIME** → Crash loops, non-zero exits, unhandled errors
- **CONFIGURATION** → Missing modules, startup issues
- **UNKNOWN** → Fallback when no clear pattern matches

Returns standardized failure object from the Day 16 taxonomy.

---

### 3. Failure Explainer (`explainer.js`)
Converts classified failures into actionable explanations:

Each explanation includes:
- **Summary** — One-line description
- **Confidence** — High/medium/low
- **Explanation** — What happened and why
- **Likely Causes** — Possible root causes
- **Suggested Checks** — How to investigate
- **Signals Observed** — Raw signal reasons

Supports all failure categories from Day 16.

---

### 4. Testing Sandbox (`server/sandbox/`)
- **testSignals.js** — Tests signal collection with mock data
- **testClassifier.js** — Tests failure classification logic
- **testExplainer.js** — Tests explanation generation

Run manually to validate intelligence logic before integration.

---

## 🔑 How It Works

```
Container Data → collectSignals() → [signals]
                       ↓
              classifyFailure(signals) → {failure}
                       ↓
              explainFailure(failure) → {explanation}
```

### Example Flow
```javascript
// Input: Container crashed with OOM and crash loop
const signals = collectSignals({
  state: { Running: false, ExitCode: 137, OOMKilled: true },
  exitCode: 137,
  restartCount: 6,
  logs: 'Error: connect ECONNREFUSED 127.0.0.1:6379'
});
// → [OOM_KILLED, OOM_STATE, CRASH_LOOP, CONNECTION_REFUSED]

const failure = classifyFailure(signals);
// → { category: RESOURCE, stage: RUN, confidence: high }

const explanation = explainFailure(failure);
// → { summary: "Container ran out of system resources", ... }
```

---

## 🧪 Testing

Test the complete pipeline:

```bash
cd server
node sandbox/testSignals.js
node sandbox/testClassifier.js
node sandbox/testExplainer.js
```

---

## 📊 Coverage

### Detects
- ✅ Out-of-memory failures
- ✅ Crash loops & restart instability
- ✅ Network connection issues
- ✅ Port conflicts
- ✅ Missing dependencies
- ✅ Unhandled runtime errors
- ✅ Non-zero exits

### Classifies Into
- ✅ Resource failures
- ✅ Network failures
- ✅ Runtime failures
- ✅ Configuration failures
- ✅ Unknown failures

### Explains With
- ✅ Human-readable summaries
- ✅ Likely causes
- ✅ Actionable suggestions
- ✅ Confidence levels

---

## 🔗 Integration Path
Day 17 is **standalone logic** — not yet integrated with API endpoints.

**Next:** Wire intelligence system into `/containers` routes so real container data flows through the pipeline automatically.

---

## 📚 Next Steps
→ **Day 18:** API integration & real-time failure analysis
