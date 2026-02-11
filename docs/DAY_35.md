# Day 35 — RBAC + Ownership Composition

> **Focus:** Authorization, Least Privilege, Defense in Depth
> **Core Principle:** "Ownership answers 'Which'. RBAC answers 'What'. Limits answer 'How much'."

---

## 🔒 Goal

Implement **strict Role-Based Access Control (RBAC)** composed with **Resource Ownership**.
- **Viewer:** Read-only access to **OWNED** resources.
- **Operator:** Operational access to **OWNED** resources. **NO** destructive access.
- **Admin:** Full access to **ANY** resource.

---

## 🛠️ Key Technical Changes

### 1. Central Permission Matrix (`src/config/permissions.js`)

- **Single Source of Truth:** Defines exact capabilities for `VIEWER`, `OPERATOR`, `ADMIN`.
- **Resolver:** Pure function `canPerform({ role, ownsResource, actionType })` determines access.
- **Strict Actions:** Categorized into `READ`, `OPERATE`, `DESTRUCTIVE`.

### 2. Ownership Guard Evolution (`src/middlewares/ownershipGuard.js`)

- **Disabled Operator Bypass:** Operators can no longer access foreign containers.
- **Signal Ownership:** Sets `req.ownsResource` flag to explicitly signal ownership status to RBAC middleware.
- **Admin Context:** Explicitly signals `ownsResource = false` (Admin access is role-based, not ownership-dependent).

### 3. RBAC Middleware (`src/middlewares/rbac.middleware.js`)

- **Layered Defense:** Runs *after* `ownershipGuard`.
- **Logic:** Checks `(Role + Ownership) -> Permission`.
- **Fail-Safe:** Blocks access (403) if permission is denied.

### 4. WebSocket Security (`src/websocket/ws.js`)

- **Handshake Protection:** Implements full RBAC check before upgrading to WebSocket.
- **Prevention:** Stops unauthorized `exec` sessions at the gate.

### 5. Frontend Signals (`src/routes/containers.routes.js`)

- **Metadata:** API responses now include `permissions: { canRead, canOperate, canDestroy }`.
- **Benefit:** UI can proactively disable buttons (Soft Enforcement) while Backend enforces hard limits.

---

## 🧪 Verification

Verified via `verify_rbac.js` sandbox script:

| User Role    | Action  | Target      | Result                |
| :----------- | :------ | :---------- | :-------------------- |
| **Viewer**   | Read    | Owned       | ✅ Allowed             |
| **Viewer**   | Operate | Owned       | 🛡️ Blocked (403)       |
| **Operator** | Operate | Owned       | ✅ Allowed             |
| **Operator** | Remove  | Owned       | 🛡️ Blocked (403)       |
| **Operator** | Operate | **Foreign** | 🛡️ Blocked (Owernship) |
| **Admin**    | Any     | Any         | 🔓 Allowed             |

---

## 📅 What's Next? (Day 36)

### Day 36 — Session Continuity & Token Rotation

### Why this day exists
Our system is stateless — now make it **feel stateful** to users.

### Backend
* Introduce **refresh token model**:
  * HttpOnly cookie
  * Bound to user + device
  * Rotatable
* `/auth/refresh` endpoint:
  * Validates refresh token
  * Issues new access token
  * Optional refresh token rotation
  * Absolute session lifetime (e.g. 24h)


### Frontend
* Token expiry tracking (`exp`)
* Silent refresh at ~80–90% lifetime
* Retry failed requests transparently
* Global auth states:
  * `active`
  * `refreshing`
  * `expired`

✅ Outcome: **No forced logouts during normal usage**
