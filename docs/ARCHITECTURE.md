# DevOpsEase — Backend Architecture

> Last updated: Day 95 (2026-06-18)

---

## 1. Folder Structure

```
server/src/
│
├── config/                  # Environment, DB, Passport, permissions, plans
│   ├── db.js                  # MongoDB connection
│   ├── envValidator.js        # Required env var check on startup
│   ├── passport.js            # GitHub OAuth strategy
│   ├── permissions.js         # RBAC action definitions (READ, OPERATE, DESTRUCTIVE)
│   └── plans.js               # User plan definitions (free, pro, premium)
│
├── constants/               # Shared constants (statuses, limits, Redis keys)
│   ├── statuses.js            # BUILD_STATUS, DEPLOYMENT_STATUS, PIPELINE_STATUS, etc.
│   ├── limits.js              # MAX_REPLICAS, timeouts, size limits, port ranges
│   ├── redis.js               # Redis key factory functions
│   └── index.js               # Barrel export
│
├── controllers/             # HTTP request handlers — thin, delegate to services
│   ├── auth.controller.js
│   ├── build.controller.js
│   ├── containers.controller.js
│   ├── deployment.controller.js
│   ├── pipeline.controller.js
│   ├── webhook.controller.js
│   └── ...
│
├── docker/                  # Direct Docker Engine API wrappers
│   ├── client.js              # Dockerode singleton
│   ├── containers.js          # Raw container log/inspect helpers
│   ├── containerActions.js    # start/stop/restart/pause/remove wrappers
│   └── events.js              # Docker event stream listener
│
├── helpers/                 # Pure utility helpers with no service dependencies
│   ├── githubSignature.helper.js
│   └── metrics.helpers.js
│
├── middlewares/             # Express middleware
│   ├── auth.middleware.js          # JWT token verification → req.user
│   ├── authRateLimit.middleware.js # Login brute-force protection
│   ├── errorHandler.js             # Global error handler (reads AppError fields)
│   ├── ownershipGuard.js           # Container ownership enforcement
│   ├── rateLimit.middleware.js     # Plan-tiered Redis rate limiter
│   ├── rbac.js / rbac.middleware.js # Role/Permission checks
│   ├── readinessMiddleware.js      # Rejects requests until server ready
│   └── requestLogger.js
│
├── models/                  # Mongoose schemas
│   ├── User.js, LoginAttempt.js    # Auth models (PascalCase convention)
│   ├── build.model.js              # Domain models (kebab-case convention)
│   ├── deployment.model.js
│   ├── pipeline.model.js
│   └── ...
│
├── routes/                  # Route definitions — middleware + controller calls only
│   └── *.routes.js
│
├── services/                # Business logic — called by controllers
│   └── *.service.js (55 files)
│
├── utils/                   # Shared pure utilities
│   ├── AppError.js            # Base class + typed subclasses
│   ├── encryption.js, jwt.js, logger.js, workspace.js
│
├── websocket/               # WebSocket server and event broadcasting
│   ├── ws.js                  # WS server init, room management
│   ├── metricsStreamer.js     # Real-time container metrics
│   ├── logStreamer.js         # Build log streaming
│   ├── execHandler.js         # Interactive docker exec over WS
│   └── *Broadcaster.js       # Event/alert/deployment broadcasting
│
├── index.js                 # Entry point — server boot, route registration
└── shutdownManager.js       # Graceful shutdown
```

---

## 2. Request Lifecycle

```
Client Request
  → CORS → requestLogger → express.json() → cookieParser → readinessMiddleware
  → Route File (*.routes.js)
    → authMiddleware       (JWT → req.user)
    → rateLimiter(action)  (plan-tiered Redis check)
    → ownershipGuard       (container ownership, where applicable)
    → requirePermission    (RBAC check)
  → Controller             (validates request, calls service)
  → Service                (business logic, DB, Docker)
  → Model / Docker / Redis
  → Controller → res.json(...)
  → (on error) errorHandler.js → res.json({ success: false, message, code })
```

---

## 3. Authentication Flow

**JWT (standard API)**
```
POST /api/auth/login
  → bruteForceService.check(ip)
  → User.findOne({ email }) → bcrypt.compare
  → jwt.sign({ userId, role, plan }) → HttpOnly cookie
  → RefreshToken.create()
```

**GitHub OAuth**
```
GET /api/auth/github → passport.authenticate('github')
  → GitHub callback → User.findOrCreate → jwt.sign → cookie
```

**Request Auth (every protected route)**
```
auth.middleware.js:
  Cookie/Authorization header → jwt.verify → User.findById → req.user
```

---

## 4. CI/CD Pipeline Flow

```
GitHub Push → POST /api/webhooks/github
  → Verify HMAC signature
  → Webhook dedup (Redis SET NX EX)
  → Lookup Repository by owner/repo
  → triggerPipeline(repo, payload)
    For each active pipeline:
      → branchMatches(push.branch, config.branch)  (wildcards: feature/*)
      → executePipeline()
        → Stale run recovery (> 30 min → auto-fail)
        → Concurrent guard (unique partial index on PipelineRun)
        → PipelineRun.create(status: running)
        → _runPipelineStepsInBackground:
            'build'  → git clone + docker build → run.buildId = build._id
            'test'   → spawn(npm test | pytest), minimal env, 5min timeout
            'deploy' → runDeployStep(run.buildId) — deploys THIS run's exact build
        → PipelineRun.status = success | failed
```

---

## 5. Deployment Flow

```
deployFromBuild(build)
  → Resolve userId → allocateContainerName → allocatePort (random)
  → Deployment.create({ userId, repoId, buildId, imageTag, ... })
  → reconcileDeployment() → createReplica() × desiredReplicas
    → docker.run(imageTag, port, cpuLimit, memoryLimit)
    → Port collision retry (3 attempts)
  → Deployment.status = 'running' | 'failed'
  → deploymentBroadcaster → WebSocket

Rollback:
  → assertDeploymentOwnership → find previous (running|stopped)
  → Stop current → Deployment.create(isRollback: true) → reconcile
```

---

## 6. WebSocket Architecture

```
Client connects: ws://localhost:PORT
  → ws.js: room-based subscription model
    subscribe('metrics:containerA')  → metricsStreamer
    subscribe('exec:containerA')     → execHandler (bidirectional)
    subscribe('build-logs:buildId')  → logStreamer

Broadcast sources:
  globalMetricsCollector  → 'metrics:{containerId}' every ~5s
  eventBroadcaster        → Docker daemon events → 'events:{userId}'
  alertBroadcaster        → alerts → 'alerts:{userId}'
  deploymentBroadcaster   → deployment state → 'deployments:{userId}'
```

---

## 7. Ownership Model

| Resource | Ownership Field | Enforcement |
|---|---|---|
| Container | `ContainerOwnership` (userId → [containerIds]) | `ownershipGuard` middleware |
| Deployment | `Deployment.userId` (direct field) | `assertDeploymentOwnership` (fast path + repo fallback) |
| Repository | `Repository.userId` | Verified in every pipeline/build/deploy operation |
| Pipeline | `Pipeline.userId` (via repo) | Checked in controller before service calls |

---

## 8. Rate Limiting

```
rateLimit.middleware.js → rateLimiter(actionType)

Action Types: 'create', 'exec', 'destructive'
Per-user, per-action, plan-tiered limits (config/plans.js)
Backend: Redis INCR + EXPIRE
Headers: X-RateLimit-Limit, X-RateLimit-Remaining, Retry-After
Fail-closed: 503 if Redis unavailable
```

---

## 9. Naming Conventions

| Layer | Convention | Example |
|---|---|---|
| Routes | `{domain}.routes.js` | `pipeline.routes.js` |
| Controllers | `{domain}.controller.js` | `pipeline.controller.js` |
| Services | `{domain}.service.js` | `pipeline.service.js` |
| Models (domain) | `{domain}.model.js` | `pipeline.model.js` |
| Models (auth) | `PascalCase.js` | `User.js`, `LoginAttempt.js` |
| Constants | `UPPER_SNAKE_CASE` | `BUILD_STATUS`, `MAX_REPLICAS` |

**Errors**: Always use typed subclasses from `utils/AppError.js`:
```js
throw new NotFoundError('Pipeline not found');       // ✅
throw new ConflictError('Already running');           // ✅
throw new Error('Not found');                         // ❌ avoid
```
