# 📅 Day 54 — Volume Governance Layer (Backend)

Per-user named Docker volumes with atomic DB-first creation, size tracking, attached container reconciliation, and a mutex-protected safe prune mechanism with rollback on failure.

---

## 🎯 Objective

- Enforce named-only volumes — no hostPath mounts from Compose or direct creation.
- Track volume size and container attachments in MongoDB, updated via live Docker inspection.
- Provide a preview-first prune flow that filters out volumes linked to active projects.
- Use per-user in-memory locks to prevent concurrent prune race conditions.
- Decrement `user.storageUsedMB` when volumes are successfully pruned.

---

## 🏗 Backend

### `volume.model.js` *(new)*
Mongoose schema for platform-managed volumes:
- Fields: `userId`, `name` (user-facing label), `dockerVolumeName` (namespaced system name), `driver` (enum: `local`), `projectId`, `sizeMB`, `attachedContainerIds[]`, `usageStatus` (enum: `ACTIVE | UNUSED | PENDING_DELETE`), `lastUsedAt`.
- Unique compound index on `{ userId, dockerVolumeName }` to prevent duplicate registrations.
- `timestamps: true`.

### `volume.service.js` *(new)*
Core volume lifecycle service:
- **`ensureVolumeExists`**: Idempotent — checks for existing doc first. Uses atomic DB reservation (unique index) to prevent TOCTOU race conditions. Creates Docker volume with governance labels (`devopsease.userId`, `devopsease.projectName`, `devopsease.volumeName`, `devopsease.managed`). Handles race condition via duplicate-key catch: fetches and returns the winner doc.
- **`deleteVolume`**: Removes Docker volume → deletes DB record. Idempotent on `404 / no such volume`.
- **`markProjectVolumesUnused`**: Batch-marks all volumes associated with a deleted project as `UNUSED` with cleared `attachedContainerIds`.
- **`reconcileVolumes`**: Fetches live size data via `docker.df()`, determines container attachments by listing all containers and scanning their `Mounts`, then updates `sizeMB`, `attachedContainerIds`, `usageStatus`, and `lastUsedAt` per volume. Marks orphaned volumes (not found in Docker) as `UNUSED` with `sizeMB: 0`.

### `volumeGovernance.service.js` *(new)*
Safe prune pipeline (mirrors `imageGovernance.service.js` pattern):
- **Per-user mutex**: `acquireLock(userId)` — in-memory promise-based lock prevents concurrent prune execution for the same user.
- **`getPruneCandidates`**: Fetches `UNUSED` volumes with empty `attachedContainerIds`. Filters out volumes linked to projects with status `RUNNING | STOPPED | CREATED`. Logs a `VOLUME_PRUNE_PREVIEW` audit event.
- **`executeSafePrune`**: Acquires lock → recalculates candidates server-side (never trusts client data) → transitions each candidate to `PENDING_DELETE` before Docker removal → rolls back to previous status on Docker failure → deletes DB record on success → decrements `user.storageUsedMB` by total reclaimed MB → emits `VOLUME_PRUNE_EXECUTED` or `VOLUME_PRUNE_FAILED` audit events.

### `volume.controller.js` *(new)*
Four controller handlers scoped to `req.user._id`:
- `listVolumes` — returns all user volumes
- `getPrunePreview` — returns candidate list and total reclaimable MB
- `pruneUnused` — executes safe prune, returns `{ reclaimedMB, deletedCount, errors }`
- `reconcileVolumes` — triggers reconciliation and returns updated counts

### `volume.routes.js` *(new)*
Four routes under `/volumes` (all behind `authMiddleware`):
- `GET /volumes` — list user's volumes
- `GET /volumes/prune-preview` — preview prune candidates
- `POST /volumes/prune-unused` — execute safe prune
- `POST /volumes/reconcile` — reconcile live Docker state → DB

### `index.js` *(modified)*
Mounted `volumeRoutes` at `/volumes`.

### `project.service.js` *(modified)*
Replaced inline `docker.createVolume()` calls with `VolumeService.ensureVolumeExists()` so all project-created volumes are now governed, tracked in MongoDB, and carry proper labels. On project delete, `markProjectVolumesUnused()` is called to correctly update status without immediate deletion.

### `composeValidation.service.js` *(modified)*
Added validation rule to block absolute `hostPath` volume mounts in Compose YAML, enforcing named-only volumes for all multi-service deployments.

---

## ✅ Outcome

> Docker volumes created through DevOpsEase are now fully accounted for. Each volume is ownership-tagged, sized, and reconciled against live Docker state. The prune mechanism uses server-side re-validation and per-user locking to ensure storage is reclaimed safely without affecting active project data. Storage accounting stays accurate after every prune operation.

---

## 🔮 What's Next

📅 Day 55 — Networks & Volumes Frontend

UI:

- Networks page with summary cards (Total, Active, Unused)
- Per-network delete with confirmation modal (blocked if ACTIVE)
- Volumes page with storage summary and Safe Clean Volumes button
- Prune preview modal showing candidates and reclaimable MB
- React Query hooks for all network and volume operations
- `ResourceNav` tabs for Networks and Volumes
