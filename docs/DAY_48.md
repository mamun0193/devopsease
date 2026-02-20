# 📅 Day 48 — Image Observability UI & Navigation Polish

Full frontend rollout of the Image Registry Observability layer — clickable image rows, dedicated image detail page, generalized filter tabs in the Header, and scroll-aware navigation.

---

## 🎯 Objective

- Expose image observability data (collected Day 47) in a rich, navigable UI
- Generalize the Header filter pill system so any page can inject its own filters
- Add a dedicated `ImageDetailPage` following the same pattern as `BuildDetailPage`
- Polish navigation: sticky nav bar, header auto-hide on scroll, correct breadcrumbs

---

## 🏗 Backend

### `image.controller.js` *(modified)*
Added `getImageById` — fetches a single image by MongoDB `_id` with ownership check.

### `image.routes.js` *(modified)*
Registered `GET /images/:imageId` route before the wildcard list route.

### `imageObservability.service.js` *(modified)*
Reconciliation now **backfills** existing records missing `pullCount` or `pulledFrom` defaults on every reconciliation cycle — fixing blank fields for images created before the schema was updated.

---

## 🖥️ Frontend

### `Header.tsx` *(modified)*
- Accepts generic `filterItems?: FilterItem[]` prop — any page can now inject its own filter pills instead of the hardcoded container filters
- Added scroll-direction detection: header **slides up and hides** when scrolling down past 60 px, reappears on scroll up
- Fires a `header-visibility` custom event so sibling components stay in sync

### `ResourceNav.tsx` *(modified)*
- Listens for `header-visibility` event and transitions between `top-16` (header visible) and `top-0` (header hidden)
- Always sticky — the nav bar never scrolls away

### `ImagesPage.tsx` *(refactored)*
- Filter tabs (`All`, `Active`, `Unused`, `Dangling`) now live in the Header via `filterItems` — inline tabs removed
- Inline expandable detail panel removed — rows now navigate to `/images/:imageId`
- Cleaner table: chevron icon on each row as a navigation cue

### `ImageDetailPage.tsx` *(new)*
Dedicated detail page at `/images/:imageId` with three cards:

| Card                    | Fields                                                                        |
| ----------------------- | ----------------------------------------------------------------------------- |
| **Overview**            | Docker Image ID (copy button, `sha256:` stripped), Size, Layers, Status badge |
| **Usage & Source**      | Pull Count, Source (`DOCKERFILE` / `REGISTRY` badge), Created, Last Used      |
| **Attached Containers** | Container ID chips (12-char truncated)                                        |

- Back arrow navigates to `/images`
- Animated card entrance via `framer-motion`

### `BuildsPage.tsx` *(modified)*
Filter tabs (`All`, `Running`, `Success`, `Failed`, `Timeout`) moved into Header via `filterItems`. `RUNNING` filter correctly includes `PENDING` status builds.

### `ContainerDetailsPage.tsx` *(modified)*
- Breadcrumb corrected: `← Dashboard / name` → `← Containers / name`
- Back link and container-removed redirect both now go to `/containers` instead of `/dashboard`

### `api/index.ts` *(modified)*
Added `imageApi.getImage(imageId)` — fetches a single image from `GET /images/:imageId`.

### `App.tsx` *(modified)*
Registered `/images/:imageId` → `ImageDetailPage` protected route.

---

## ✅ Outcome

> Images are now fully observable through a dedicated detail page. Filter tabs are centralized in the Header with a unified interaction pattern across Images, Builds, and Containers pages. The navigation chrome is polished — the header auto-hides on scroll while the resource nav bar remains persistently accessible.

---

# 🔮 What's Next: Day 49 — Image Storage Governance Engine

This is critical for SaaS survival.

## 🏗 Backend

**1️⃣ Per-user storage calculation**
- `totalImageStorageMB`
- `totalBuildCacheMB`

**2️⃣ Safe prune API — `POST /images/prune-unused`**

Logic:
- Cannot delete if container is running
- Soft delete → verify → hard delete
- Audit log entry on every prune

**3️⃣ Protection**
- Cross-tenant isolation enforced at query level
- Admin override requires elevated role

**4️⃣ Prune detection rules**
- No containers attached
- Not referenced by a compose project
- Not recently built (< X hours, configurable)

## 🖥️ Frontend

- **"Clean Storage" button** with impact preview
- Confirm modal showing exact MB that will be freed
- Post-prune refresh of the image list

## ✅ Outcome

> Disk explosion prevention implemented. Per-user storage governance answers the SaaS-scale architectural concern — users can't silently accumulate uncollected image layers indefinitely.
