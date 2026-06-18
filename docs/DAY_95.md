# DAY 95: Architecture Cleanup & Maintainability

## Overview
Day 95 was a backend-only architecture cleanup sprint. Zero new features, zero business logic changes, full backward compatibility. The goal was to address long-term maintainability, readability, and project structure issues without changing runtime behavior.

---

## 1. Standardized API Routes (T1)

All 30 route files are now canonically mounted under `/api/`:

| Before | After (canonical) |
|---|---|
| `/auth` | `/api/auth` |
| `/containers` | `/api/containers` |
| `/builds` | `/api/builds` |
| `/images` | `/api/images` |
| `/projects` | `/api/projects` |
| `/networks` | `/api/networks` |
| `/volumes` | `/api/volumes` |
| `/dockerhub` | `/api/dockerhub` |
| `/tunnels` | `/api/tunnels` |
| `/quota` | `/api/quota` |
| `/alerts` | `/api/alerts` |
| `/actions` | `/api/actions` |
| `/admin` | `/api/admin` |
| `/health` | `/api/health` |
| `/metrics` | `/api/metrics` |
| `/system` | `/api/system` |

Old bare paths remain as backward-compatible aliases. The frontend and CLI continue working without any changes.

---

## 2. Split containers.routes.js (T2)

The largest route file (530 lines) was split into proper MVC layers:

- **Before:** `containers.routes.js` (530 lines) — all Docker logic, ownership checks, quota management, and metrics queries inline.
- **After:** `containers.routes.js` (64 lines, routing only) + `containers.controller.js` (320 lines, handler logic).

15 handler functions extracted:
`listContainers`, `removeAllContainers`, `createContainerHandler`, `getContainerLogsHandler`, `inspectContainer`, `startContainerHandler`, `stopContainerHandler`, `restartContainerHandler`, `pauseContainerHandler`, `unpauseContainerHandler`, `removeContainerHandler`, `getContainerStats`, `getTopContainers`, `getMetricsHistory`, `getRecentMetrics`

---

## 3. Centralized Constants (T4)

Created `server/src/constants/` directory with 4 files:

- **`statuses.js`** — `BUILD_STATUS`, `DEPLOYMENT_STATUS`, `PIPELINE_STATUS`, `PIPELINE_RUN_STATUS`, `CONTAINER_STATUS` (all `Object.freeze()`'d) plus derived arrays: `BUILD_TERMINAL_STATUSES`, `DEPLOYMENT_ROLLBACK_ELIGIBLE`, `PIPELINE_RUN_ACTIVE_STATUSES`
- **`limits.js`** — `MAX_REPLICAS`, `MAX_PIPELINE_STEPS`, `MAX_PIPELINE_YAML_SIZE`, `TEST_STEP_TIMEOUT_MS`, `PORT_MIN`/`PORT_MAX`, `DEFAULT_CPU_LIMIT`, `WEBHOOK_DEDUP_TTL_SECONDS`, etc.
- **`redis.js`** — Key factory functions: `REDIS_KEY_RATE_LIMIT(userId, action)`, `REDIS_KEY_WEBHOOK_DEDUP(deliveryId)`, etc.
- **`index.js`** — Barrel re-export of all three modules

---

## 4. Custom Error Classes (T5)

Extended `utils/AppError.js` with typed subclasses:

| Class | Status | Error Code |
|---|---|---|
| `ValidationError` | 400 | `VALIDATION_ERROR` |
| `UnauthorizedError` | 401 | `UNAUTHORIZED` |
| `ForbiddenError` | 403 | `FORBIDDEN` |
| `NotFoundError` | 404 | `NOT_FOUND` |
| `ConflictError` | 409 | `CONFLICT` |
| `RateLimitError` | 429 | `RATE_LIMIT_EXCEEDED` |
| `ServiceUnavailableError` | 503 | `SERVICE_UNAVAILABLE` |

The existing `AppError` class and `errorHandler.js` are untouched — full backward compatibility. The `default export` is preserved so existing `import AppError from '...'` imports work.

---

## 5. Barrel Index Files (T6)

Created barrel export files for simplified imports:

- **`controllers/index.js`** — re-exports all 17 default controllers + named container controller functions
- **`middlewares/index.js`** — re-exports all 11 middleware functions/defaults
- **`constants/index.js`** — re-exports all constants (done as part of T4)

---

## 6. Dead Code Removal (T7)

- **Deleted:** `server/src/routes/inspect.routes.js` — not registered in `index.js`, superseded by the inspect endpoint in `containers.routes.js`
- **Verified alive:** `imageGovernance.routes.js` (mounted via `image.routes.js`)

---

## 7. Architecture Documentation (T9)

Created **`docs/ARCHITECTURE.md`** covering:
- Backend folder structure (annotated tree)
- Request lifecycle (middleware → router → controller → service → model)
- Authentication flow (JWT + GitHub OAuth)
- CI/CD pipeline flow (webhook → branch filter → concurrent guard → build → deploy)
- Deployment flow (deployFromBuild → reconcile → Docker containers)
- WebSocket architecture (room-based subscriptions, 4 broadcast sources)
- Ownership model (containers, deployments, repositories)
- Rate limiting architecture (plan-tiered, Redis-backed)
- Naming conventions (files, variables, errors)

---

## Files Summary

### New Files (9)
| File | Purpose |
|---|---|
| `server/src/constants/statuses.js` | Centralized status enums |
| `server/src/constants/limits.js` | Centralized limits and timeouts |
| `server/src/constants/redis.js` | Redis key factory functions |
| `server/src/constants/index.js` | Constants barrel export |
| `server/src/controllers/containers.controller.js` | Extracted container handlers |
| `server/src/controllers/index.js` | Controller barrel export |
| `server/src/middlewares/index.js` | Middleware barrel export |
| `docs/ARCHITECTURE.md` | Backend architecture documentation |
| `docs/DAY_95.md` | This file |

### Modified Files (2)
| File | Change |
|---|---|
| `server/src/utils/AppError.js` | Added 7 typed error subclasses |
| `server/src/index.js` | Normalized routes under `/api/` with backward-compat aliases |
| `server/src/routes/containers.routes.js` | Reduced from 530 → 64 lines (handlers → controller) |

### Deleted Files (1)
| File | Reason |
|---|---|
| `server/src/routes/inspect.routes.js` | Dead code (unregistered, superseded) |

## Breaking Changes

**None.** All old route paths continue working via backward-compat aliases. API response format unchanged. Frontend and CLI fully compatible.
