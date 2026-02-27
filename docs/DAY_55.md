# 📅 Day 55 — Networks & Volumes Frontend

Dashboard pages for network and volume management — summary cards, sortable data tables, safe delete/prune flows with confirmation modals, and React Query-powered data fetching. All pages follow the existing layout and component conventions.

---

## 🎯 Objective

- Surface user-scoped network and volume data in the dashboard.
- Allow safe deletion of unused networks with a confirmation gate.
- Expose the volume prune flow as a preview-first modal so users know what will be deleted before confirming.
- Integrate Networks and Volumes into `ResourceNav` for consistent navigation.

---

## 🖥️ Frontend

### `api/index.ts` *(modified)*
Added `Network` and `Volume` TypeScript interfaces and corresponding API objects:
- **`networkApi`**: `list()`, `getById(id)`, `delete(id)`, `reconcile()`.
- **`volumeApi`**: `list()`, `prunePreview()`, `pruneUnused()`, `reconcile()`.

### `useNetworks.ts` *(new)*
React Query hooks for the network API:
- `useNetworks()` — fetches all user networks, auto-invalidated on mutation.
- `useDeleteNetwork()` — mutation that calls `DELETE /networks/:id` and invalidates the networks query on success.

### `useVolumes.ts` *(new)*
React Query hooks for the volume API:
- `useVolumes()` — fetches all user volumes.
- `usePrunePreview()` — fetches prune candidates and total reclaimable MB.
- `usePruneUnused()` — mutation that executes the safe prune and invalidates volumes on success.

### `NetworkTable.tsx` *(new)*
Sortable table component displaying network rows:
- Columns: Name, Status badge (`ACTIVE` → green, `UNUSED` → yellow), Driver, Created At, Delete action.
- Delete button is disabled when `usageStatus === 'ACTIVE'` with a tooltip explaining why.
- Accepts `onDelete`, `isDeleting`, and `deletingId` props for per-row loading state.

### `VolumeTable.tsx` *(new)*
Table component displaying volume rows:
- Columns: Name, Size (formatted as MB or GB), Status badge, Attached Containers count, Last Used, Created At.
- Read-only — deletion is handled via the prune modal.

### `PruneVolumesModal.tsx` *(new)*
Two-step prune modal for volumes:
- **Step 1 (Preview)**: Fetches `GET /volumes/prune-preview` on mount. Displays a table of candidate volumes (name, size) and total reclaimable storage. A "Prune" confirm button is enabled only when candidates exist.
- **Step 2 (Result)**: On successful prune, shows reclaimed MB, deleted count, and any partial errors. Uses Redux toast feedback for success and failure.
- Shares the mutex-protection guarantee from the backend — the button is disabled while a prune is in flight.

### `NetworksPage.tsx` *(new)*
Full networks management page:
- Three summary cards: **Total Networks**, **Active**, **Unused** — animated via Framer Motion.
- Renders `NetworkTable` with delete wiring.
- On delete request, opens `ConfirmModal` with network name. On confirm, fires `useDeleteNetwork` mutation with Redux toast feedback.
- Spinner shown during initial load.

### `VolumesPage.tsx` *(new)*
Full volumes management page:
- Three summary cards: **Total Storage** (aggregated MB/GB), **Active**, **Unused**.
- **"Safe Clean Volumes"** button — disabled when no unused volumes exist. Opens `PruneVolumesModal` on click.
- Renders `VolumeTable`. Read-only; destructive action is scoped to the prune modal.
- Spinner shown during initial load.

### `ResourceNav.tsx` *(modified)*
Added **Networks** (with `Network` icon) and **Volumes** (with `HardDrive` icon) tabs, linking to `/networks` and `/volumes` respectively.

### `App.tsx` *(modified)*
Protected routes added for `/networks` and `/volumes`.

---

## ✅ Outcome

> Users can now view, monitor, and manage their Docker networks and volumes directly from the DevOpsEase dashboard. Network deletion is gated by attachment status. Volume storage can be safely reclaimed through a preview-first UI that mirrors the existing image governance flow — consistent experience, no surprises.

---

## 🔮 What's Next

📅 Day 56 — Docker Hub Integration

Backend:

- Encrypted credential storage
- Private image pull
- Pull rate limiting
- Pull audit logging

Frontend:

- Connect Docker Hub
- Pull image
- Push image

Outcome:

> External registry integration.
