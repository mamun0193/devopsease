# DevOpsEase — Multi-Tenant Container PaaS Platform

A production-grade, full-stack PaaS built on Docker. Users deploy and manage containers on shared infrastructure — with real authentication, multi-tenant isolation, image governance, network and volume management, project (Compose) support, registry integration, audit logging, temporary public port exposure, a dynamic application gateway, automated domains and SSL, preview environments, automated backups, AI-powered insights, and a fully extensible developer platform.

> **114-day production build.** Every subsystem is battle-tested. 

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** v20+
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
│              React Dashboard (Vite)          │
│  React Query · Redux · Tailwind · TS         │
└───────────────────┬──────────────────────────┘
                    │ REST / WebSocket
┌───────────────────▼──────────────────────────┐
│              Express.js API (ESM)            │
│  JWT Auth · RBAC · Audit · Quota Middleware  │
├──────────────┬───────────────────────────────┤
│  MongoDB     │  Redis (cache + action log)   │
├──────────────┴───────────────────────────────┤
│              Dockerode (Docker Engine API)   │
└──────────────────────────────────────────────┘
```

---

## ✨ Feature Matrix

### 🔐 Auth & Identity
- JWT access tokens + rotating refresh tokens via HttpOnly cookies
- GitHub OAuth & Google OAuth (Passport.js)
- Role-Based Access Control (RBAC) + Personal Access Tokens (PATs)
- Developer Platform with Platform Authentication (Extension API)

### 📦 Container Management
- Full lifecycle control: Create, start, stop, restart, remove
- Real-time stats (CPU, memory, network) and log streaming
- In-browser terminal (WebSocket exec session)
- Strict per-user isolation and action history (audit log)

### 🌐 Application Gateway & Domains
- Dynamic multi-tenant routing (Layer 7 Proxy)
- Automated Let's Encrypt SSL/TLS Certificate management
- Custom domains with CNAME verification and health checks
- Zero-downtime routing updates via Redis caching

### 🔄 CI/CD & Deployments
- Dockerfile builds and Docker Compose project management
- Automated Preview Environments (Deploy per PR/Branch)
- Seamless Git Integration for automatic deployments
- Built-in release policies and deployment rollbacks

### 🧠 AI & Autopilot
- Failure Intelligence: Automatic categorization of crashes (OOM, Network, Config)
- Generative AI root-cause analysis and suggested fixes
- Platform Autopilot for predictive scaling and self-healing

### 🛡️ Resilience & Security
- Automated daily backups and retention policies
- Platform Health observability and threshold monitoring
- Secret Redaction and AES-256-GCM encryption for credentials

### 🔌 Developer Platform
- Public API and SDK readiness
- Extension architecture and Marketplace foundation
- Secure webhooks and event subscriptions

---

## 📚 Build Journey

| Days    | Topic                                                   |
| ------- | ------------------------------------------------------- |
| 1–30    | Docker fundamentals, Container lifecycle, RBAC, Auth    |
| 31–60   | Builds, Projects, Volumes, Networks, Hub, Tunnels       |
| 61–75   | Application Gateway, Traffic Routing, Releases          |
| 76–85   | Custom Domains, SSL, Verification, Webhooks             |
| 86–95   | Preview Environments, Resilience, Backups, Autopilot    |
| 96–110  | AI Integration, Observability, Alerting, CLI            |
| 111–114 | Developer Platform, API Standardization, Launch Polish  |

Full documentation in [`/docs`](./docs/).

---

## 👨‍💻 Author

**Mamun** — [github.com/mamun0193](https://github.com/mamun0193)
