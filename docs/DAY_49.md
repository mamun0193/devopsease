# 📅 Day 49 — Image Storage Governance

Safe per-user image and build cache pruning mechanism with a preview-first flow. This feature prevents storage exhaustion without relying on global Docker system prunes and without cross-tenant bleed.

---

## 🎯 Objective

- Implement safe, per-user image storage cleanup.
- Support wiping unneeded Docker builder cache layers directly from the UI.
- Prevent concurrent pruning operations using in-memory mutex locks.
- Ensure no images attached to running containers are ever deleted.
- Introduce a preview step so users know exactly what will be deleted before confirming.

---

## 🏗 Backend

### `imageGovernance.service.js` *(new)*
- **Mutex Locks**: Implements a per-user lock (`acquireLock`) to prevent race conditions during concurrent prune requests.
- **Candidate Selection**: Identifies prune candidates by checking for `UNUSED` or `DANGLING` status, ensuring 0 attached containers, enforcing a 1-hour age buffer, and running a live double-check against Docker Engine containers.
- **Safe Execution**: Transitions images to a transient `PENDING_DELETE` state before contacting Docker Engine. Deletes DB records and emits rollback on failures.
- **Build Cache Prune**: Directly dials the Docker Engine HTTP API (`POST /build/prune?all=1`) to enforce a deep sweep of the builder cache, bypassing standard library limitations.

### `imageGovernance.controller.js` & `imageGovernance.routes.js` *(new)*
Registered three new routes under the auth middleware:
- `GET /images/prune-preview`
- `POST /images/prune-unused`
- `POST /images/prune-build-cache`

### `imageGovernance.audit.js` *(new)*
Fire-and-forget security logging. Emits `IMAGE_PRUNE_PREVIEW`, `IMAGE_PRUNE_EXECUTED`, `IMAGE_PRUNE_FAILED`, and `BUILD_CACHE_PRUNE_EXECUTED` events to the existing `SecurityLog` model.

### `image.js` (Model) *(modified)*
Added `PENDING_DELETE` to the `imageUsageStatus` enum to support safe transient states during the prune lifecycle.

### `image.routes.js` *(modified)*
Mounted the new governance routes before the `/:imageId` param route to prevent path collisions.

---

## 🖥️ Frontend

### `api/index.ts` *(modified)*
Added `prunePreview()`, `pruneUnused()`, and `pruneBuildCache()` bindings to the `imageApi` object.

### `ImagesPage.tsx` *(modified)*
- **"Safe Clean Storage" Button & Modal**: Opens a preview modal displaying a table of candidate images (tags and sizes) and the total reclaimable MB. Submitting triggers the prune, invalidates queries, and shows a success toast.
- **"Clean Cache" Button & Modal**: Displays the current active builder cache size (e.g., 523.8 MB) and requests confirmation to explicitly wide the Docker Engine cache layers.
- **Notifications**: Integrated Redux toast notifications for clean success and failure feedback during these destructive operations.

---

## ✅ Outcome

> Users can now govern their storage usage autonomously and safely. The system handles race conditions gracefully, respects strict cross-tenant data isolation, and communicates closely with the Docker Engine to avoid breaking running workloads. Disk explosion prevention is fully implemented.

---

# 🔮 What's Next: 

📅 Day 50–52 — Docker Compose Projects

Compose integrates with:

- Ownership
- Image storage tracking
- Quota hooks
- Audit logs

Backend:

- Parse YAML
- Validate restricted fields:
  - `privileged: true`
  - `network_mode: host`
  - hostPath volumes
- Namespace: `project_<userId>_<name>`
- Track services
- Project-level metrics

Storage Integration:

- Images used by project counted in user storage
- Build artifacts linked

Outcome:

> Multi-service apps with governance.
