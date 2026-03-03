# DevOpsEase — Multi-Tenant Container PaaS Platform

A production-grade, full-stack PaaS built on Docker. Users deploy and manage containers on shared infrastructure — with real authentication, multi-tenant isolation, image governance, network and volume management, project (Compose) support, registry integration, audit logging, and temporary public port exposure.

> **57-day learning build.** Every feature is documented in [`/docs`](./docs/).

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** v18+
- **Docker** (running locally)
- **MongoDB** (Atlas or local)
- **Redis** (optional — caching degrades gracefully)

### Setup

```bash
git clone https://github.com/mamun0193/devopsease.git
cd devopsease

# Start Redis (optional)
docker compose up redis -d

# Backend
cd server
npm install
cp .env.example .env   # fill in values
npm start

# Frontend (new terminal)
cd ../dashboard
npm install
npm run dev
```

Frontend: `http://localhost:5173` · API: `http://localhost:3497`

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────┐
│              React Dashboard (Vite)           │
│  React Query · Redux · Framer Motion · TS    │
└───────────────────┬──────────────────────────┘
                    │ REST / WebSocket
┌───────────────────▼──────────────────────────┐
│              Express.js API (ESM)             │
│  JWT Auth · RBAC · Audit · Quota Middleware  │
├──────────────┬───────────────────────────────┤
│  MongoDB     │  Redis (cache + action log)   │
├──────────────┴───────────────────────────────┤
│              Dockerode (Docker Engine API)    │
└──────────────────────────────────────────────┘
```

---

## ✨ Feature Matrix

### 🔐 Auth & Identity
- JWT access tokens + rotating refresh tokens via HttpOnly cookies
- GitHub OAuth & Google OAuth (Passport.js)
- Multi-tab token refresh coordination (Web Locks API)
- Brute-force protection with login attempt tracking
- Role-Based Access Control — `admin` / `operator` / `viewer`
- Plan-based quotas (`free`, `pro`)

### 📦 Container Management
- Create, start, stop, restart, pause, unpause, remove
- Real-time stats (CPU, memory, network) — 2s polling
- Live log streaming with parsed log levels and filtering
- In-browser terminal (WebSocket exec session)
- Container ownership — strict per-user isolation
- Action history (Redis-backed timeline)

### 🧠 Failure Intelligence
- Automatic failure classification: `RESOURCE`, `NETWORK`, `RUNTIME`, `CONFIG`, `CRASH_LOOP`
- Instability scoring + MTBF (Mean Time Between Failures) prediction
- Confidence-scored explanations with suggested fixes
- Per-container failure history and trend analysis

### 🖼️ Image Governance
- Image registration and usage tracking (`ACTIVE` / `UNUSED` / `DANGLING`)
- Safe prune — only removes images with no attached containers
- Build cache prune
- Storage accounting per user
- Event-driven reconciliation on container create/destroy

### 🏗️ Docker Image Builds
- Dockerfile-based builds streamed via WebSocket
- Build status model: `PENDING` → `RUNNING` → `SUCCESS` / `FAILED` / `TIMEOUT`
- AI-powered build failure analysis
- Stale build recovery on server restart

### 🗂️ Project (Compose) Management
- Multi-service project deployment from Compose YAML
- Per-project network and volume provisioning
- Start / Stop / Delete with rollback safety
- External delete detection — auto-reconciles status to `STOPPED`

### 🌐 Network Governance
- Namespaced bridge networks per user/project
- Usage tracking (`ACTIVE` / `UNUSED`)
- Safe delete gated by attachment status
- Reconciliation against live Docker state

### 💾 Volume Governance
- Named volumes only — host path mounts blocked
- Per-user volume tracking with storage accounting
- Safe prune with preview — shows reclaimable MB before confirming
- Compose integration with rollback-safe creation

### 🐳 Docker Hub Integration
- Encrypted credential storage (AES-256-GCM)
- Credentials validated against Docker Hub API before saving
- Pull and push with rate limiting (10 pulls/hr, 5 pushes/hr)
- Searchable image catalog with popular image grid
- Full audit trail for all registry operations

### 🔗 Temporary Port Exposure (Tunnels)
- Time-limited public HTTPS URLs for container ports
- Duration options: 15 min / 30 min / 1 hour / 2 hours / 6 hours
- Max 3 active tunnels per user (hard quota)
- Auto-expire via 60-second background scheduler
- Auto-revoke on container stop, delete, or Docker CLI event
- Provider abstraction (currently ngrok, swappable)
- Full audit trail: `TUNNEL_CREATED` / `TUNNEL_REVOKED` / `TUNNEL_EXPIRED`

### 📋 Audit & Observability
- Security event log for all sensitive operations
- Per-event severity (`INFO` / `WARN` / `HIGH`)
- Action history timeline per container
- Admin observability dashboard

---

## 📋 Project Structure

```
devopsease/
├── dashboard/                  # React + Vite + TypeScript
│   └── src/
│       ├── api/                # Axios API layer + TypeScript types
│       ├── components/         # UI components
│       │   └── tunnels/        # Port exposure UI
│       ├── hooks/              # React Query hooks per domain
│       ├── pages/              # Top-level route pages
│       ├── store/              # Redux (auth, toast slices)
│       └── utils/
│
├── server/                     # Express.js ESM backend
│   └── src/
│       ├── config/             # DB, env validation, plans, RBAC
│       ├── controllers/        # Request handlers
│       ├── docker/             # Dockerode client, actions, events
│       ├── middlewares/        # Auth, RBAC, ownership guard
│       ├── models/             # Mongoose models
│       ├── resources/          # Resource registry service
│       ├── routes/             # Express routers
│       ├── security/           # Activity monitor, brute force
│       ├── services/           # Business logic + audit modules
│       │   └── providers/      # Pluggable tunnel providers
│       ├── websocket/          # WS server (terminal + builds)
│       └── utils/
│
└── docs/                       # Per-day build documentation
```

---

## � Environment Variables

Create `server/.env`:

```env
PORT=3497
MONGO_URI=mongodb+srv://...
JWT_SECRET=your_secret
ENCRYPTION_KEY=64_hex_chars          # AES-256-GCM key for credential storage
NGROK_AUTH_TOKEN=                    # Required for tunnel feature
TUNNEL_PROVIDER=ngrok

# OAuth (optional)
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Admin seed
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=strong_password
```

---

## 🛡️ Security Model

| Concern             | Implementation                                              |
| ------------------- | ----------------------------------------------------------- |
| Authentication      | JWT + rotating refresh tokens, HttpOnly cookies             |
| Multi-tenancy       | All DB queries scoped to `userId` — no shared state         |
| Container isolation | `ContainerOwnership` model, `ownershipGuard` middleware     |
| Secrets at rest     | AES-256-GCM encryption, `select: false` on sensitive fields |
| Brute force         | Login attempt tracking with lockout                         |
| Quota enforcement   | Plan-based limits on containers, tunnels, pulls             |
| Audit trail         | `SecurityLog` for all sensitive operations                  |
| Cross-tenant leaks  | Ownership verified before every mutating action             |

---

## � API Overview

| Prefix        | Description                                        |
| ------------- | -------------------------------------------------- |
| `/auth`       | Register, login, logout, refresh, OAuth            |
| `/containers` | Full container lifecycle + stats + logs + terminal |
| `/images`     | Image governance, prune, storage                   |
| `/builds`     | Dockerfile builds, status, failure analysis        |
| `/projects`   | Compose-based project management                   |
| `/networks`   | Network governance and reconciliation              |
| `/volumes`    | Volume governance and safe prune                   |
| `/dockerhub`  | Registry connect, pull, push, search               |
| `/tunnels`    | Temporary public port exposure                     |
| `/health`     | Readiness and system health                        |
| `/metrics`    | Usage metrics                                      |
| `/admin`      | Admin-only observability                           |

---

## 📚 Build Log

| Days  | Topic                                                   |
| ----- | ------------------------------------------------------- |
| 1–2   | Docker backend fundamentals                             |
| 16–20 | Failure detection, intelligence, observability          |
| 21–22 | Log parsing and LogViewer UI                            |
| 23–26 | Container controls, stats, action timeline              |
| 27    | Redis caching layer                                     |
| 28–29 | Container create, pause/unpause, real-time terminal     |
| 30    | Role-based access control                               |
| 31–36 | JWT auth, refresh tokens, OAuth, brute force protection |
| 37–40 | Security audit, admin dashboard, plans & quotas         |
| 41–44 | Build system (Dockerfile → image via WebSocket)         |
| 45–46 | Build failure intelligence, build observability         |
| 47–49 | Image governance, safe prune, storage accounting        |
| 50–52 | Project (Compose) management, multi-service deploy      |
| 53–54 | Network governance, volume governance                   |
| 55    | Networks & Volumes frontend                             |
| 56    | Docker Hub integration (connect, pull, push, search)    |
| 57    | Temporary public port exposure (tunnels)                |

Full documentation in [`/docs`](./docs/).

---

## 👨‍💻 Author

**Mamun** — [github.com/mamun0193](https://github.com/mamun0193)
