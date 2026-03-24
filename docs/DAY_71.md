# Day 71 — Deployment Engine

## Overview

Built the deployment engine for DevOpsEase:

**Successful build → Container launch → Port allocation → Status tracking → Stop/Remove lifecycle**

The goal was to take completed CI builds and automatically run them as Docker containers with full lifecycle management.

---

## Core Implementation Theory

The deployment is orchestrated through `deployFromBuild(build)` and follows a strict sequence:

1. Validate `imageTag` exists on build
2. Allocate unique `containerName` (DB + Docker inspect, retry on collision)
3. Allocate unique `port` in 3000–9000 range (DB check against active deployments)
4. Create deployment record as `deploying`
5. Execute `docker run -d -p <port>:3000 --name <containerName> <imageTag>`
6. Finalize state as `running` or `failed`

This sequence keeps behavior deterministic and safe against partial failures.

---

## Docker Command Strategy

- `runContainer` → `docker run -d` with port mapping and named container, returns `containerId`
- `stopContainer` → `docker stop` with 30s timeout
- `removeContainer` → `docker rm -f` with 30s timeout
- `containerExists` → `docker inspect` check for collision detection

All commands use `spawn` with process-level timeouts (60s default) and full stderr capture.

---

## Architecture Decisions

- Created dedicated `docker/deploymentDocker.js` separate from existing `cliExec.js` (different return semantics — needs stdout capture for containerId)
- Deployment service is stateless and export-based (no class) for clean import from build pipeline
- Build pipeline integration is non-blocking (`deployFromBuild().catch(...)`) — deployment errors never crash builds
- `removeDeployment` soft-deletes via `removed` status instead of DB deletion (preserves history for future rollbacks)

This keeps the design modular and ready for Day 76 (Rollbacks) and Day 77+ (Kubernetes).

---

## Reliability and Safety

- `imageTag` is validated before any deployment begins
- Container name collisions are handled with retry (DB + Docker inspect dual check, 5 attempts)
- Port conflicts are handled with retry (20 attempts across 3000–9000 range)
- Transient `docker run` failures get 1 automatic retry (matches timeout/connection refused patterns)
- Partial containers are cleaned up on failure (`docker rm -f`)
- Stop/remove operations guard against missing `containerId` before calling Docker
- Full stderr is captured and stored in `errorLog` (truncated at 5KB)
- All async operations are fully non-blocking and error-safe

---

## Performance Notes

- Build pipeline returns immediately; deployment runs in background
- Port and name allocation use indexed DB queries for fast lookups
- Docker command timeouts prevent hanging processes (60s run, 30s stop/remove, 10s inspect)
- Error logs are truncated to prevent DB bloat

---

## Testing Context

- All imports verified against existing codebase modules
- Patterns match existing conventions (spawn with shell on Windows, structured logger, statusCode errors)
- Editor diagnostics passed for all new and modified files

---

## ✅ Outcome

DevOpsEase now supports automated container deployments from successful builds, with full lifecycle management (deploy, stop, remove), collision-safe resource allocation, and production-grade error handling.

## What's Next

📅 **Day 72 — Environment system and Deployment UI**

- env.model.js Support:dev / staging / production
- DeploymentsPage Features:history, version tracking, rollback button

✅ Outcome: Environment-based deployment and deployment visibility 