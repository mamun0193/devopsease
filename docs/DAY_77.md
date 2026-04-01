# Day 77 — Desired-State Deployment Scaling (Reconciliation Model)

## Overview

Implemented **multi-container scaling with a desired-state reconciliation model** for the deployment system. Instead of one-time imperative container creation, the system now declares intent (`desiredReplicas`), inspects actual Docker state, and reconciles the difference — mimicking core Kubernetes controller behavior.

---

## Delivered Scope

### 1. Model Update (`server/src/models/deployment.model.js`)
* Added `desiredReplicas` (Number, default: 1, min: 1, max: 10) — represents desired state.
* Added `containerIds` (String[]) — tracks all replica container IDs.
* Actual running count is derived from `containerIds.length` vs Docker inspection.

### 2. Docker Utility Separation (`server/src/docker/deployment.js`)
* Added `getContainerState(containerId)` — returns live Docker status (`running`, `exited`, `null`).
* Added `getRunningContainerIds(ids)` — filters a set of IDs to only those actually running.

### 3. Docker Service Abstraction (`server/src/services/docker.service.js`) — **NEW**
* `allocatePort()` — scans all active deployments globally to build a used-ports set before allocating.
* `allocateContainerName()` — moved from deployment service for separation of concerns.
* `createReplica(imageTag, repoName)` — allocates name + port, runs container with retry, returns `{ containerId, containerName, port }`.
* `destroyReplica(containerId)` — stops + removes a container with safe error handling.
* `tryCleanupContainer()` — best-effort removal.

### 4. Reconciliation Engine (`server/src/services/deployment.service.js`)
* Added `reconcileDeployment(deploymentId)`:
  1. Queries Docker for which recorded containers are actually running.
  2. Cleans dead/crashed containers from the record.
  3. If `actual < desired` → creates missing replicas (with partial failure rollback).
  4. If `actual > desired` → removes excess replicas from the tail.
  5. Persists reconciled `containerIds` and status.

### 5. Refactored Scaling Functions
* **`scaleDeployment()`**: now only updates `desiredReplicas` in DB, then calls `reconcileDeployment()`.
* **`deployFromBuild()`**: sets `desiredReplicas`, creates deployment record, then delegates to `reconcileDeployment()`.
* **`stopDeployment()` / `removeDeployment()`**: iterate all `containerIds` with per-container logging.
* **`rollbackDeployment()`**: uses `createReplica()` abstraction from docker.service.js.

### 6. Port Management Improvement
* **Before**: random port → check single `port` field per deployment → retry 20 times.
* **After**: scan all active deployments to build global `Set<port>` → check against set → retry 50 times.

### 7. Error Handling
* Partial scale-up failure: newly created containers are cleaned up, existing replicas preserved.
* Dead container detection: reconciliation prunes crashed containers from the record.
* DB consistency: `containerIds` only updated after Docker operations complete.

---

## API (unchanged)

**`POST /api/deployments/:id/scale`** — `{ "replicas": N }` → updates desired state → triggers reconciliation → returns updated deployment.

---

## Refinements

1. **Desired vs Actual**: `desiredReplicas` is intent, `containerIds.length` is reality. Reconciliation bridges the gap.
2. **Self-Healing**: dead containers are detected and replaced during any reconciliation cycle.
3. **Modular Docker Layer**: container lifecycle abstracted into `docker.service.js`, deployment logic stays in `deployment.service.js`.
4. **Safe Port Allocation**: global scan prevents cross-deployment port conflicts.

---

## ✅ Outcome

The deployment system now follows a declarative desired-state model. Scaling is resilient, self-healing, and architecturally aligned with Kubernetes reconciliation semantics.

## What's Next

📅 **Day 78 —K8s Client Integration and Cluster Connection**

- Install and configure @kubernetes/client-node in backend
- Build k8sClient.service.js to load kubeconfig and initialize client
- Implement core functions: listPods() and listNamespaces() to verify connection
- Create cluster.model.js to store kubeconfig, name, and connection status
- Develop API + simple UI to connect cluster and display connection result