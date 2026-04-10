# Day 85 — CI/CD Pipeline Definition System (YAML Parsing & Config Storage)

## Overview

Added user-defined CI/CD pipelines via YAML configuration. Users define pipeline steps (`build`, `test`, `deploy`) in a YAML string, which is parsed, validated, and stored in the database with versioning support.

This becomes the foundation for the pipeline execution engine — no execution yet, only definition and storage.

---

## Backend

### `pipeline.model.js` — NEW

Mongoose schema for pipeline definitions:

| Field | Type | Description |
|-------|------|-------------|
| userId | ObjectId | Owner reference (→ User) |
| repoId | ObjectId | Linked repository (→ Repository) |
| name | String | Pipeline name (max 128 chars) |
| config | Object | Parsed YAML config |
| rawYaml | String | Original YAML string |
| status | String | `active` / `inactive` / `error` |
| version | Number | Auto-incremented on update |

Indexes: `userId + createdAt`, `repoId + createdAt`, `userId + repoId`

### `pipeline.service.js` — NEW

Core service with modular functions:

- `parsePipelineYaml(yamlString)` — parses YAML via `js-yaml`, rejects invalid syntax
- `validatePipelineConfig(config)` — ensures `steps` is a non-empty array of allowed values (`build`, `test`, `deploy`), rejects duplicates
- `createPipeline({ userId, repoId, yamlString, name })` — verifies repo ownership → parses → validates → stores with version tracking (updates increment version)
- `getUserPipelines(userId)` / `getPipelineById(id, userId)` / `deletePipeline(id, userId)` — standard CRUD, user-scoped

### `pipeline.controller.js` — NEW

Handlers for create, list, get, and delete. Input validation at controller level (`repoId` and `yaml` required). Surfaces service-level `statusCode` errors directly.

### `pipeline.routes.js` — NEW

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/pipelines` | Create/update pipeline from YAML |
| GET | `/api/pipelines` | List user's pipelines |
| GET | `/api/pipelines/:id` | Get single pipeline |
| DELETE | `/api/pipelines/:id` | Delete pipeline |

All routes behind `authMiddleware`.

### `index.js` — MODIFIED

Registered pipeline routes at `/api/pipelines`.

---

## YAML Format

```yaml
steps:
  - build
  - test
  - deploy
```

Allowed steps: `build`, `test`, `deploy`

---

## Response Shape

```json
{
  "id": "6801...",
  "name": "my-pipeline",
  "steps": ["build", "test", "deploy"],
  "version": 1,
  "status": "active",
  "createdAt": "2026-04-10T..."
}
```

---

## Error Handling

| Scenario | Status | Message |
|----------|--------|---------|
| Missing YAML/repoId | 400 | `repoId and yaml are required` |
| Invalid YAML syntax | 400 | `Invalid YAML syntax: ...` |
| Missing steps field | 400 | `Pipeline config must include a "steps" field` |
| Empty steps array | 400 | `"steps" array must not be empty` |
| Invalid step name | 400 | `Invalid step(s): foo. Allowed: build, test, deploy` |
| Duplicate steps | 400 | `Duplicate steps are not allowed` |
| Repo not found | 404 | `Repository not found or access denied` |
| Pipeline not found | 404 | `Pipeline not found` |

---

## ✅ Outcome

→ Valid YAML is parsed and stored with version tracking  
→ Invalid YAML, unknown steps, empty/duplicate steps are all rejected  
→ Pipeline names auto-generated from repo name if not provided  
→ Re-submitting same pipeline name increments version instead of duplicating  
→ All access is user-scoped — no cross-user visibility  

## What's Next

📅 **Day 86 — Pipeline Execution Engine**

- Trigger actual pipeline execution (build → test → deploy)
- Track step-by-step progress with per-stage status

**🎯 Goal**
Wire pipeline definitions into the existing build + deployment services for end-to-end CI/CD execution
