# Day 87 — Secret Manager (Encrypted Secrets + Runtime Injection)

## Overview

Built a full secret management system for DevOpsEase.
Users store sensitive values (API keys, tokens, passwords) per environment, encrypted at rest using AES-256-GCM.
Secrets are automatically injected into Docker containers at runtime and referenced by name in generated Kubernetes YAML — plaintext values never appear in any API response or manifest.

---

## Backend

### `secret.model.js` — NEW

Created a Mongoose schema for user-scoped encrypted secrets:

| Field | Type | Description |
|-------|------|-------------|
| userId | ObjectId | Owner reference (→ User) |
| name | String | Env var key — validated regex, max 256 chars |
| value | String | AES-256-GCM encrypted value (`select: false`) |
| environment | String | `development` / `staging` / `production` |

Compound unique index on `{ userId, environment, name }` prevents duplicate keys per environment.
`value` has `select: false` so it is never returned by default queries.

### `secret.service.js` — NEW

Core service with five exported functions:

| Function | Description |
|----------|-------------|
| `createSecret` | Validates input, encrypts value, persists to DB |
| `getSecrets` | Lists secrets with value always masked as `****` |
| `updateSecret` | Partial update — re-encrypts only if value is provided |
| `deleteSecret` | Ownership-scoped deletion |
| `getDecryptedSecretsMap` | Returns `{ NAME: plaintext }` map — internal use only for runtime injection |

Validation helpers:
- `normalizeEnvironment` — enforces the allowed enum
- `normalizeSecretName` — validates against `^[A-Za-z_][A-Za-z0-9_]*$`
- `normalizeSecretValue` — rejects empty values and enforces 8192-char max before encryption

### `secret.controller.js` — NEW

Handlers for all four routes. Basic presence check at controller level (`name`, `value`, `environment` required for create). All service-level errors surfaced via `next(error)`.

### `secret.routes.js` — NEW

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/secrets` | Create a secret |
| GET | `/api/secrets?environment=production` | List secrets (values masked) |
| PUT | `/api/secrets/:id` | Update name / value / environment |
| DELETE | `/api/secrets/:id` | Delete a secret |

All routes behind `authMiddleware`.

### `index.js` — MODIFIED

Registered secret routes at `/api/secrets`.

---

## Docker Secret Injection

### `docker/deployment.js` — MODIFIED

Extended `runContainer` to accept an `envVars` map and inject each entry as an explicit Docker arg:

```
docker run -e KEY=VALUE ... image
```

Secrets are passed directly in the args array — they never touch `process.env` or the spawned process's environment object, avoiding `/proc` leaks.

### `docker.service.js` — MODIFIED

Extended `createReplica` to accept and forward the `envVars` map to `runContainer`.

### `deployment.service.js` — MODIFIED

Added `resolveDeploymentSecretEnv(deployment)`:
- looks up the repo's `userId` from the database
- calls `getDecryptedSecretsMap(userId, environment)` to fetch decrypted secrets for the correct environment
- returns the map for container injection

Both `reconcileDeployment` and `rollbackDeployment` now call this before spawning any container.

---

## Kubernetes Secret Injection

### `k8s.controller.js` — MODIFIED

Extended `generateDeploymentYamlAction` to:
1. fetch the user's stored secrets for the requested environment
2. build `valueFrom.secretKeyRef` references pointing to a Kubernetes Secret named `devopsease-managed-<environment>`
3. merge with any user-supplied `env` entries — user-defined entries take priority via key deduplication

### `k8sDeployment.service.js` — MODIFIED

Extended `parseEnvList` to handle `valueFrom` entries alongside plain `value` entries:
- rejects items with both `value` and `valueFrom` set
- emits proper Kubernetes env var objects using `valueFrom.secretKeyRef`

---

## Encryption

| Property | Value |
|----------|-------|
| Algorithm | AES-256-GCM |
| Key source | `ENCRYPTION_KEY` env var (64 hex chars = 32 bytes) |
| Stored format | `iv:authTag:ciphertext` (all hex-encoded) |
| Auth tag | 16 bytes — prevents ciphertext tampering |

Startup fails immediately if `ENCRYPTION_KEY` is missing or not 64 hex chars.

---

## Error Handling

| Scenario | Status | Code |
|----------|--------|------|
| Duplicate secret name in same environment | 409 | `DUPLICATE_SECRET_NAME` |
| Invalid environment value | 400 | `INVALID_ENVIRONMENT` |
| Invalid secret name format | 400 | `VALIDATION_ERROR` |
| Value exceeds 8192 characters | 400 | `VALIDATION_ERROR` |
| No fields provided in update | 400 | `VALIDATION_ERROR` |
| Secret not found (update / delete) | 404 | `NOT_FOUND` |
| Encryption or decryption failure | 500 | `ENCRYPTION_FAILURE` |

---

## ✅ Outcome

→ Secrets stored encrypted at rest — plaintext never persists to the database  
→ Secret values never returned in any API response (always `****`)  
→ Docker containers receive secrets as explicit `-e KEY=VALUE` args — no process env leakage  
→ Kubernetes YAML references secrets via `secretKeyRef` — no plaintext in manifests  
→ Rollbacks and reconciliation both inject the correct environment's secrets  
→ Full CRUD including update — no need to delete and recreate to rotate a value  

## What's Next

📅 **Day 88 — CLI Tool**

- Build CLI tool for DevOpsEase

**🎯 Goal**
Build CLI for DX (Developer Experience)