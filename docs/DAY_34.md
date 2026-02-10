# Day 34 — Plan Limits & Redis Rate Limiting

> **Focus:** Abuse Prevention, Resource Management, System Stability
> **Core Principle:** "Fail-Closed Security. Plan Enforcement First."

---

## 🔒 Goal

Implement **strict plan-based container limits** and **fail-closed rate limiting** to protect the DevOpsEase platform from abuse. Ensure that no user can exceed their plan's container quota or flood the system with requests, even if Redis is unavailable.

---

## 🛠️ Key Technical Changes

### 1. Centralized Plan Configuration

- **New Config:** `src/config/plans.js` defines limits for `free`, `paid`, and `premium` tiers.
- **Tiers:**
  - **Free:** 1 container, 10 execs/min.
  - **Paid:** 5 containers, 60 execs/min.
  - **Premium:** 20 containers, 300 execs/min.

### 2. Plan-Based Container Limits

- **Enforcement:** Checked *before* Docker interaction.
- **Mechanism:** `ownershipService.countOwnedContainers(userId)` vs `PLANS[plan].maxContainers`.
- **Outcome:** Returns `403 Forbidden` if limit reached.

### 3. Fail-Closed Rate Limiting

- **Middleware:** `rateLimit.middleware.js` protects `create`, `destructive`, and `exec` actions.
- **Fail-Closed:** If Redis is down, actions are **blocked** (503 Service Unavailable) rather than allowed.
- **Logic:** Atomic-like `INCR` + `EXPIRE` via Redis.

### 4. WebSocket Protection

- **Secure Handshake:** `ws.js` intercepts upgrade requests.
- **Auth:** Verifies JWT from `auth` cookie.
- **Rate Limit:** Calls `enforceRateLimit` before upgrading to WebSocket.
- **Outcome:** Prevents "backdoor" shell access.

---

## 🧪 Verification

Verified via `verify_limits.js` sandbox script:

| Test Case                | Result                                  |
| :----------------------- | :-------------------------------------- |
| **Plan Limit (Free)**    | ✅ Blocked after 1 container             |
| **Plan Limit (Premium)** | ✅ Blocked after 20 containers           |
| **Rate Limit (Exec)**    | ✅ Blocked after 10 requests (429)       |
| **Redis Outage**         | 🛡️ Fail-Closed (503 Service Unavailable) |
| **Redis Recovery**       | ✅ System recovers automatically         |

---

## 📅 What's Next? (Day 35)

## 📅 Day 35 — RBAC + Ownership Enforcement

**Pillar:** Control & Execution

* Combine RBAC + ownership:
    * Viewer + owner → read-only
    * Operator + owner → full control
* Backend enforcement (hard)
* UI enforcement (soft)
* Clear 403 errors

✅ **End goal:** *No unauthorized actions possible*
