# 📅 Day 56 — Docker Hub Integration

Secure Docker Hub integration with encrypted credential storage, authenticated image pull/push, rate limiting, audit logging, and a full frontend with popular image discovery and search.

---

## 🎯 Objective

- Enable users to securely connect their Docker Hub accounts.
- Pull and push images to/from Docker Hub from the platform.
- Enforce rate limits, storage quotas, and audit every registry action.
- Provide a searchable image catalog with popular images for quick pulls.

---

## 🔐 Backend

### Encryption — `utils/encryption.js` *(new)*
- AES-256-GCM encryption/decryption for Docker Hub passwords.
- Startup guard validates `ENCRYPTION_KEY` is exactly 32 bytes (64 hex chars). Fails fast if invalid.

### DockerHub Model — `models/dockerHub.model.js` *(new)*
- Stores `userId`, `username`, `encryptedPassword` (select: false), `connectedAt`.
- `encryptedPassword` is excluded from default queries to prevent accidental exposure.

### DockerHub Service — `services/dockerHub.service.js` *(new)*
- **`connectDockerHub`** — Validates credentials against Docker Hub API (`docker.checkAuth`) before encrypting and saving. Rejects invalid credentials with 401 `AUTH_FAILED`.
- **`disconnectDockerHub`** — Removes stored credentials.
- **`getDockerHubStatus`** — Returns connection status and username.
- **`pullImage`** — Enforces pull rate limits, decrypts credentials, pulls via Dockerode, registers image (with storage accounting), and audits.
- **`pushImage`** — Enforces push rate limits, verifies image ownership, tags, pushes to Docker Hub, and audits. Validates repo tag format and length.
- **`searchImages`** — Proxies Docker Hub's public search API (`hub.docker.com/v2/search/repositories`). Returns normalized results (name, description, stars, official, pull count). 8s timeout.

### Rate Limiter — `services/registryRateLimiter.service.js` *(new)*
- In-memory per-user rate limiting: 10 pulls/hr, 5 pushes/hr, 2 concurrent pulls.

### Audit — `services/dockerHub.audit.js` *(new)*
- Fire-and-forget audit logging for all Docker Hub events. No sensitive metadata logged.

### Routes — `routes/dockerHub.routes.js` *(new)*
| Method | Path                    | Description                |
| ------ | ----------------------- | -------------------------- |
| POST   | `/dockerhub/connect`    | Connect Docker Hub account |
| DELETE | `/dockerhub/disconnect` | Disconnect account         |
| GET    | `/dockerhub/status`     | Get connection status      |
| POST   | `/dockerhub/pull`       | Pull an image              |
| POST   | `/dockerhub/push`       | Push an image              |
| GET    | `/dockerhub/search?q=`  | Search Docker Hub          |

---

## 🖥️ Frontend

### `api/index.ts` *(modified)*
- Added `dockerHubApi` with methods: `connect`, `disconnect`, `status`, `pull`, `push`, `search`.
- TypeScript types: `DockerHubStatus`, `PullImageResponse`, `PushImageResponse`, `DockerHubSearchResult`, `DockerHubSearchResponse`.
- Axios interceptor updated to skip token refresh for `/dockerhub/` 401 errors (they are credential failures, not session expiry).

### `hooks/useDockerHub.ts` *(new)*
- `useDockerHubStatus()` — Query with 60s refetch.
- `useConnectDockerHub()` — Mutation with password state clear on settle.
- `useDisconnectDockerHub()` — Mutation with status invalidation.
- `usePullImage()` — Mutation that invalidates images + storage queries.
- `usePushImage()` — Mutation that invalidates images query.
- `useDockerHubSearch(query)` — Query with keepPreviousData for smooth debounce UX.
- All mutations include granular error-code-to-toast mapping (429, 401, 403, 404).

### `ConnectDockerHubCard.tsx` *(new)*
- Connection form with username/password fields, connected state display, disconnect with confirmation modal.
- Password cleared from state immediately after request settles.

### `PullImageCard.tsx` *(new)*
- Manual image name input, pull button, disabled when not connected.

### `DockerHubSearch.tsx` *(new)*
- **Popular Images grid** — 12 curated images (nginx, redis, postgres, mongo, node, python, mysql, alpine, ubuntu, httpd, rabbitmq, memcached) with one-click pull.
- **Search bar** — 400ms debounce, results show name, description, official badge, star count, pull count, and Pull button.

### `PushImageModal.tsx` *(new)*
- Modal for entering repository and tag to push an image. Validates format, length, spaces.

### `RegistryPage.tsx` *(new)*
- Vertical stacked layout: Connection → Pull → Explore/Search.
- Added as top-level nav item (`/registry`) with Globe icon in `ResourceNav`.

### `ImagesPage.tsx` *(modified)*
- Added "Pull images from Docker Hub" banner linking to `/registry`.
- Added "Push" button per image row (disabled when not connected).

---

## 🛡️ Security Considerations

- Passwords encrypted at rest with AES-256-GCM. Never logged or returned in responses.
- `encryptedPassword` field uses `select: false` — excluded from all default queries.
- Credentials validated against Docker Hub API before storage.
- Multi-tenant isolation maintained — all queries userId-scoped.
- Rate limiting prevents abuse (10 pulls/hr, 5 pushes/hr, 2 concurrent).
- Push verifies image ownership before allowing.

---

## 🐛 Bugs Fixed

- **Project status reconciliation** — Projects now auto-detect when containers/networks are deleted externally and reconcile status to STOPPED.
- **Project restart after deletion** — `startProject` now detects missing containers and rebuilds from stored compose YAML instead of silently failing.
- **Safe Clean for registry images** — Changed prune candidate filter from `createdAt` (1 hour) to `lastUsedAt` (5 minutes) so recently-pulled unused images become reclaimable.

---

## ✅ Outcome

> Users can connect their Docker Hub accounts, browse popular images, search the entire Docker Hub catalog, and pull/push images — all from within DevOpsEase. Every action is rate-limited, audited, and encrypted at rest. Project lifecycle management now handles external container/network deletions gracefully.

---

## 🔮 What's Next

📅 Day 57 — Secure Port Exposure (temporary public URLs + expiry + audit)

- Generate temporary public URLs for exposed ports
- Expose ports with optional expiry (1h)
- Audit logs for all port exposures
- Time-bound access tokens


Outcome:

> Secure port exposure with temporary public URLs, optional expiry, and audit logging.


