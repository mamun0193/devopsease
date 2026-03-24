# Day 70 — Deployment Model

## Overview

Implemented the Deployment data model to track deployments generated from successful builds.

This creates the persistence layer required for:
- deployment lifecycle tracking
- rollback support
- multi-environment deployments (`development`, `staging`, `production`)
- Day 71 deployment engine orchestration

---

## Model File

| File | Purpose |
| --- | --- |
| `server/src/models/deployment.model.js` | Stores deployment metadata, runtime state, environment target, and build-to-deployment linkage |

---

## Schema Features

### Core References

- `repoId` → ObjectId ref `Repository` (required)
- `buildId` → ObjectId ref `Build` (required)

### Deployment Metadata

- `imageTag` → string (required, trimmed)
- `containerId` → string (default `null`)
- `environment` → enum (`development`, `staging`, `production`) default `development`
- `status` → enum (`pending`, `deploying`, `running`, `failed`, `stopped`) default `pending`

### Auditability

- `timestamps: true` enabled
- auto-managed `createdAt` and `updatedAt`

---

## Indexing Strategy

To support fast deployment lookups and timelines:

- index on `{ repoId: 1, createdAt: -1 }` for repo deployment history (newest first)
- index on `{ buildId: 1 }` for build → deployment traceability

This aligns with the main query patterns used by deployment services and UI timelines.

---

## Status Lifecycle (Intended Flow)

`pending` → `deploying` → `running`

Failure/stop paths:
- `deploying` → `failed`
- `running` → `stopped`

These states provide clear operational visibility for engine and UI layers.

---

## Why This Matters

The Deployment model is the contract between CI outputs and runtime delivery:

- links build artifacts to runtime containers
- captures per-environment release intent
- enables rollback candidate selection by history
- provides a clean source of truth for Day 73 deployment UI

---

## ✅ Outcome

DevOpsEase now has a production-ready deployment persistence model with strict enums, lifecycle states, timestamps, and query-focused indexes.

## What’s Next

📅 **Day 71 — Deployment Engine**

- convert build artifacts into deploy actions
- create/start/reconcile containers from `imageTag`
- move deployment status through lifecycle states
- persist runtime `containerId` and failure reasons
