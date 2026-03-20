# Day 65 — Git Service + Workspace

## Overview

Built the Git cloning and workspace management layer using `simple-git`. Each user gets an isolated workspace at `/workspace/<userId>/<repoId>/`. The service handles cloning, pulling, and branch switching with production-grade safety measures.

---

## What Was Built

**Workspace isolation** — Repos clone into dedicated per-user directories derived from `process.cwd()`, ensuring the paths work on any OS and inside Docker.

**Shallow cloning** — Uses `--depth 1` to fetch only the latest snapshot, keeping CI fast. Clones target the repo's default branch by default.

**Partial clone recovery** — Before cloning, the service checks if `.git` exists. If the folder is present but `.git` is missing (partial/failed clone), it deletes the folder and re-clones cleanly. A `force` flag allows explicit re-clones via the API.

**Path traversal protection** — All workspace paths are resolved with `path.resolve()` and verified to start within the workspace base. Attempts to escape via `../` chains are rejected.

**60s timeout** — Every git operation runs with a hard timeout to prevent hanging builds in the CI pipeline.

**Branch checkout** — Before creating a new branch, the service checks if it exists on the remote. If yes, it checks out. If no, it creates from current HEAD.

**Ownership validation** — Every API endpoint fetches the repo from DB and verifies `repo.userId === req.user._id` before performing any git operation. Returns 403 if mismatched.

---

## API

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/api/git/clone/:repoId` | Clone repo into local workspace |
| `POST` | `/api/git/pull/:repoId` | Pull latest on default branch |
| `POST` | `/api/git/checkout/:repoId` | Switch or create a branch |

All endpoints return `{ success, workspacePath, repoId, branch }`.

---

## ✅ Outcome

Code can be fetched locally into isolated per-user workspaces, ready to be consumed by the CI pipeline.

---

## What's Next

📅 Day 66 — Repository UI

- Build `ConnectRepoModal` and `RepoListTable` components
- Show repo name, branch, last build, and status
- Full repo management UI
