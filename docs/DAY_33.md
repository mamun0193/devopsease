# Day 33 — Ownership-Based Container Visibility

> **Focus:** Security, Multi-tenancy, Data Isolation
> **Core Principle:** "MongoDB authorizes. Docker executes."

---

## 🔒 Goal

Implement **strict ownership-based visibility and enforcement** such that users can only see and interact with their own containers. Docker must never be queried globally for normal user requests.

---

## 🛠️ Key Technical Changes

### 1. Global Docker List Restriction

- **OLD:** `GET /containers` -> `docker.listContainers()` -> Filter in code. (Inefficient & Insecure)
- **NEW:** `GET /containers` -> `MongoDB (owned IDs)` -> `Docker Inspect (specific IDs)`.
- **Reason:** Ensures a user **never** touches a container they don't own, even at the API level.

### 2. Ownership Guard Middleware

- Created `ownershipGuard` middleware applied to all `/:id` routes.
- **Flow:**
  1. Check `req.user.role` (Admin/Operator bypass).
  2. Check MongoDB for active ownership (`ownerId` + `containerId`).
  3. If valid -> `next()`.
  4. If invalid -> **Log Security Event** -> Return `403 Forbidden`.

### 3. Security Logging

- New `SecurityLog` model tracks denied access attempts.
- Logs: `userId`, `containerId`, `action`, `result: 'denied'`, `timestamp`.
- Prepares for future admin auditing features (Day 37).

### 4. Sanitized Responses

- API no longer returns raw Docker inspect objects.
- Returns whitelisted fields: `id`, `name`, `image`, `state`, `ports`, `created`.
- Hides sensitive internal data like mounts, env vars, and network configs from listing.

---

## 🧪 Verification

Verified via `verify_ownership.js` sandbox script:

| Test Case          | Result               |
| :----------------- | :------------------- |
| **Owner Access**   | ✅ Success (200)      |
| **Foreign Access** | 🛡️ Blocked (403)      |
| **Admin Access**   | 🔓 Bypassed (Allowed) |
| **Security Log**   | 📝 Created on denial  |

---

## 📅 What's Next? (Day 34)

### Day 34 — Plan Limits & Rate Limiting

**Pillar:** Control & Limits

- **Define plans:**
  - **Free:** 1 container
  - **Paid:** configurable
- **Enforce container creation limits**
- **Redis-backed rate limiting:**
  - create
  - exec
  - destructive actions
- **User-based limits**
✅ **End goal:** *Server protected from abuse*
