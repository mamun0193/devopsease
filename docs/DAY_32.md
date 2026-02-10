# 📅 Day 32 — OAuth Authentication & User Lifecycle

Day 32 completes the **identity layer** of DevOpsEase.  
This day transitions the system from **assumed identity** to **verified, persistent user identity**, forming the foundation for secure multi-tenant behavior.

By the end of Day 32, every request in the system is tied to a **real authenticated user**, backed by MongoDB and enforced through JWT-based sessions.

---

## 🎯 Objectives Achieved

- Real user authentication using OAuth (Google & GitHub)
- Persistent user identity stored in MongoDB
- Secure session management using JWT
- Removal of all simulated or fake identity mechanisms
- Clean separation between authentication and authorization

---

## 🔐 Authentication Flow

```

Browser
→ OAuth Provider (Google / GitHub)
→ Backend Callback
→ User Resolution (MongoDB)
→ JWT Issuance
→ HTTP-only Cookie
→ Auth Middleware

```

OAuth proves **who the user is**.  
MongoDB defines **who the user is in our system**.  
JWT enforces **trusted access on every request**.

---

## 🗃️ User Model (MongoDB Source of Truth)

Each human maps to exactly one user document.

```json
{
  "_id": ObjectId,
  "primaryEmail": "user@example.com",
  "authProviders": {
    "google": {
      "id": "provider-id",
      "email": "user@example.com"
    }
  },
  "role": "operator",
  "plan": "free",
  "status": "active",
  "createdAt": Date,
  "lastLoginAt": Date
}
```

### Key Guarantees

* One user per human (email-based merging)
* Multiple OAuth providers can be linked safely
* Identity persists across sessions and restarts

---

## 🔑 JWT Session Design

* Short-lived JWT (30 minutes)
* Signed with backend secret
* Stored in HTTP-only cookies
* Payload contains only:

  * `userId`
  * `role`
  * `plan`

Example decoded payload:

```json
/auth/me
{
  "userId": "698adb4c93a6e5b50b75d***",
  "role": "operator",
  "plan": "free",
  "iat": 1770707788,
  "exp": 1770709588
}
```

---

## 🛡️ Auth Middleware

All protected routes now rely on JWT validation:

* Missing or invalid token → `401 Unauthorized`
* Valid token → `req.user` populated
* No fallback headers
* No simulated identities

This middleware is now the **only entry point** to authenticated access.

---

## 🧪 Verification Checklist (Passed)

* OAuth redirect works for Google & GitHub
* MongoDB user created on first login
* Re-login does not create duplicate users
* JWT cookie issued correctly
* `/auth/me` returns authenticated identity
* Removing cookie denies access

---

## 🧠 Architectural Outcome

After Day 32:

* Identity is real, persistent, and cryptographically verified
* MongoDB is the authority on users
* Docker remains completely unaware of users
* Ownership logic (Day 31) can now be enforced safely

This completes the **Identity pillar** of the system.

---

## 📅 Day 33 — Ownership-Based Container Visibility

**Pillar:** Identity & Execution

### Planned Work

* Modify container list API:

  * Fetch owned container IDs from MongoDB
  * Query Docker **only** for those IDs
* Hide all non-owned containers
* Ensure logs, stats, and actions enforce ownership
* Optional admin/operator override

### ✅ End Goal

**Users see ONLY their containers**

Docker executes.
MongoDB decides visibility.
