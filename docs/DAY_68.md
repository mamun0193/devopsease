# Day 68 — Project Detection Engine

## Overview

Added a project detector that scans a cloned repo root and decides build type for CI.

## What Changed

| File | Change |
| --- | --- |
| `server/src/services/projectDetector.service.js` | Added `detectProjectType(repoPath)` with safe path validation, detection priority, `detectedFiles`, and Node metadata extraction |

## How It Works

- Validates repo path safely before filesystem access
- Checks only root-level config files (fast, no deep scan)
- Applies priority rules to choose one project type
- Reads `package.json` (if present) to extract project `name` and `hasStartScript`
- Returns normalized metadata for CI/build orchestration

## Detection Priority

1. `docker-compose.yml` / `docker-compose.yaml` → `compose`
2. `Dockerfile` → `docker`
3. `package.json` → `node`
4. `requirements.txt` → `python`
5. else → `unknown`

## Output

```js
{
  type,
  config: { hasDockerfile, hasCompose, hasPackageJson, hasRequirements },
  detectedFiles,
  node: { name, hasStartScript }
}
```

## ✅ Outcome

DevOpsEase now auto-detects how a repo should be built and returns normalized metadata for pipeline decisions.

## What's Next

📅 **Day 69 — Build Pipeline Orchestrator**

- Select strategy by detected type
- Trigger unified build jobs
- Add build status + telemetry
