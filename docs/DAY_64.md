# Day 64 — Repository Resource Model

## Overview

Introduced the Repository Resource Model — the foundation for CI/CD pipelines. Users can connect Git repositories, list them, and delete them securely.

---

## What Changed

| File | Change |
| --- | --- |
| `models/repository.model.js` | **New** — Repository schema with provider, cloneUrl, status, lastBuildId |
| `controllers/repository.controller.js` | **New** — `connectRepository`, `getRepositories`, `deleteRepository` |
| `routes/repository.routes.js` | **New** — `POST /connect`, `GET /`, `DELETE /:id` behind `authMiddleware` |
| `index.js` | Registered routes at `/api/repos` |

---

## API

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/api/repos/connect` | Connect a Git repository |
| `GET` | `/api/repos` | List user's repositories |
| `DELETE` | `/api/repos/:id` | Delete a repository (owner-scoped) |

---

## ✅ Outcome

Users can link GitHub, GitLab, or Bitbucket repos to their account. Deletes are scoped by `userId` so users can never remove each other's repos.

---

## What's Next

📅 Day 65 — Git Service + Workspace

- Create `git.service.js` with `cloneRepository()`, `pullLatest()`, `checkoutBranch()`
- Workspace structure: `/workspace/<userId>/<repoId>`
- Add repo ownership validation

✅ Outcome: Code can be fetched locally
