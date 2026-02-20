# 📅 Day 47 — Build Failure Intelligence

Automatically classify why a Docker build failed and surface that analysis to the user as an advisory panel.

---

## 🎯 Objective

- Deterministic pattern-based failure classification (no ML, no external calls)
- Persist structured analysis on every `FAILED`/`TIMEOUT` build
- Show an advisory panel in the Build Detail UI above the log viewer
- Keep intelligence fully isolated — zero changes to the streaming or success path

---

## 🏗 Backend

### `buildIntelligence.service.js` *(new)*
Stateless classifier. Scans the last 200 log lines, returns:
```js
{ type, confidence, explanation, evidence[], failingStage }
```

| Type                        | Signal                                   | Confidence |
| --------------------------- | ---------------------------------------- | ---------- |
| `BUILD_BASE_IMAGE_MISSING`  | `pull access denied`, `manifest unknown` | 0.9        |
| `BUILD_SYNTAX_ERROR`        | `unknown instruction`, `syntax error`    | 0.9        |
| `BUILD_RESOURCE_EXHAUSTION` | `out of memory`, `killed`                | 0.9        |
| `BUILD_PERMISSION_DENIED`   | `permission denied`                      | 0.9        |
| `BUILD_DISK_SPACE`          | `no space left on device`                | 0.95       |
| `BUILD_TIMEOUT`             | status-based                             | 1.0        |
| `BUILD_UNKNOWN`             | fallback                                 | 0.4        |

Stage extraction: scans logs backwards for the last `Step N/Y :` line.

### `build.model.js` *(modified)*
Added `failureAnalysis` subdocument: `type`, `confidence`, `explanation`, `evidence[]`, `failingStage`.

### `build.service.js` *(minimal change)*
4 lines added inside the existing `catch` block — extracts log lines, runs classifier, saves result. Also fixes a pre-existing bug: `logSummary` is now persisted on failure too.

### `GET /builds/images` *(new)*
Returns user's built images (`tag`, `sizeMB`, `layerCount`) for use in the container creation selector.

---

## 🖥️ Frontend

### `BuildFailurePanel.tsx` *(new)*
Compact dark card with red/orange accent border showing: failure type badge, explanation, confidence %, failing stage chip, evidence lines. Only renders on `FAILED`/`TIMEOUT`.

### `BuildDetailPage.tsx` *(modified)*
Single conditional render between error display and log viewer:
```tsx
{(displayStatus === 'FAILED' || displayStatus === 'TIMEOUT') && build.failureAnalysis && (
    <BuildFailurePanel analysis={build.failureAnalysis} />
)}
```

### Container Creation — Image Selector
`CreateContainerModal` gains a two-tab image picker: **My Images** (dropdown from `/builds/images`) and **Custom** (free-text, original behaviour). Auto-falls back to Custom if no images exist.

---

## ✅ Outcome

> Every failed build is now **explainable** — classified by type, with evidence lines and the exact failing Dockerfile step, persisted automatically and shown in the UI with zero latency added to build execution.

---

# 🔮 What's Next: Day 48 — Image Registry & Observability

Before pruning, we observe.

**Track:**
- Total image disk usage per user
- Dangling images (no tag, no container)
- Images not attached to any running/stopped container
- Build cache size
- Pull history

**Add `imageUsageStatus` to the Image model:**
- `ACTIVE` — image is used by at least one container
- `UNUSED` — built but no container references it
- `DANGLING` — untagged, orphaned layer

**UI:**
- Image library page with full registry view
- Storage impact view (per-image and total)
- Unused image indicator

**Outcome:**
> You now see storage pressure forming.
