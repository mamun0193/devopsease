# Day 36 — Session Continuity & Token Rotation

> **Focus:** Authentication Lifecycle, Stateless-to-Stateful UX, Security
> **Core Principle:** "The best auth is invisible. Users stay logged in — securely."

---

## 🎯 Goal

Transform the authentication layer from a single-token system into a **production-grade dual-token architecture** with:
- **Short-lived access tokens** (30 min) for API authorization.
- **Long-lived refresh tokens** (7 days) for seamless session continuity.
- **Automatic token rotation** to prevent replay attacks.
- **Family-based revocation** to kill entire compromised sessions.
- **Silent session restoration** — no forced logouts during normal usage.

---

## 🛠️ Key Technical Changes

### 1. Refresh Token Model (`src/models/RefreshToken.js`) `[NEW]`

Mongoose schema tracking the full lifecycle of each refresh token:

| Field                 | Purpose                                          |
| :-------------------- | :----------------------------------------------- |
| `userId`              | Owner reference (`ObjectId → User`)              |
| `tokenHash`           | SHA-256 hash of the raw token (never store raw)  |
| `deviceId`            | Binds token to a specific device/session         |
| `familyId`            | Groups all tokens from a single login event      |
| `userAgent`           | Tracks the originating browser/client            |
| `ipAddress`           | Tracks the originating IP                        |
| `expiresAt`           | Absolute session lifetime (7 days from login)    |
| `revoked`             | Whether this token has been consumed/invalidated |
| `revokedAt`           | Timestamp of revocation                          |
| `replacedByTokenHash` | Links revoked token to its successor (chain)     |

**Auto-Cleanup:** TTL index on `expiresAt` — MongoDB automatically deletes expired documents.

---

### 2. JWT Utilities (`src/utils/jwt.js`) `[MODIFIED]`

Expanded from a simple `generateToken()` to a full token lifecycle engine:

| Function               | Responsibility                                      |
| :--------------------- | :-------------------------------------------------- |
| `generateAccessToken`  | Signs JWT with `userId`, `role`, `plan` (30m TTL)   |
| `generateRefreshToken` | Creates random 40-byte token, hashes, stores in DB  |
| `rotateRefreshToken`   | Revokes old token, creates successor in same family |
| `verifyRefreshToken`   | Looks up token by hash, populates user              |
| `revokeSessionFamily`  | Bulk-revokes all tokens sharing a `familyId`        |

**Key Design Decisions:**
- Refresh tokens are **opaque random strings** (not JWTs) — stateful by design.
- Rotation preserves the **absolute expiry** from the original login — no infinite sessions.
- Family chain enables **reuse detection**: if a revoked token is presented, the entire family is killed.

---

### 3. Auth Controller (`src/controllers/auth.controller.js`) `[NEW]`

Centralized authentication endpoints:

#### `POST /auth/register`
- Validates email + password, hashes with bcrypt (10 rounds).
- Creates user with default `operator` role.
- **Auto-login:** Issues both tokens immediately after registration.

#### `POST /auth/login`
- Credential validation against stored hash.
- Updates `lastLoginAt` timestamp.
- Issues access token (cookie, 15 min) + refresh token (restricted-path cookie, 7 days).

#### `GET /auth/login/success` (OAuth callback)
- Resolves OAuth user via `resolveOAuthUser`.
- Issues dual tokens and redirects to frontend.

#### `POST /auth/refresh`
- **Reuse Detection:** If token is revoked → kill entire family → clear cookies → 401.
- **Expiry Check:** If past absolute lifetime → clear cookies → 401.
- **Happy Path:** Rotate token, issue new access + refresh cookies.

#### `POST /auth/logout`
- Revokes current refresh token.
- Clears both cookies.

**Cookie Configuration:**
```
Access Token:  httpOnly, sameSite=lax, path=/,             maxAge=15min
Refresh Token: httpOnly, sameSite=lax, path=/auth/refresh, maxAge=7days
```
Path-restricting the refresh cookie to `/auth/refresh` limits its exposure surface.

---

### 4. Auth Status Middleware (`src/middlewares/authStatus.middleware.js`) `[NEW]`

**Purpose:** Silent session restoration without requiring an explicit refresh call.

**Flow:**
1. Check access token → valid? Attach `req.user`, proceed.
2. Access token expired? Check refresh token → valid? **Silently rotate**, set new cookies, attach `req.user`.
3. No valid tokens? Set `req.user = null`, proceed (let downstream middleware decide).

**Used by:** `/auth/me` endpoint — the frontend calls this on mount to restore session state.

---

### 5. Auth Routes (`src/routes/auth.routes.js`) `[MODIFIED]`

Refactored from inline handlers to controller-based architecture:

```diff
- app.get("/auth/login/success", async (req, res) => { /* inline logic */ })
+ router.post("/register", register);
+ router.post("/login", login);
+ router.post("/refresh", refresh);
+ router.post("/logout", logout);
+ router.get("/login/success", passport.authenticate(...), loginSuccess);
```

Added `/auth/me` endpoint using `checkAuthStatus` middleware for session probing.

---

### 6. Auth Middleware (`src/middlewares/auth.middleware.js`) `[MODIFIED]`

Updated to read access token from **cookies** instead of `Authorization` header:

```diff
- const token = req.headers.authorization?.split(" ")[1];
+ const token = req.cookies?.access_token;
```

---

### 7. Frontend Auth Context (`src/context/`) `[NEW]`

#### `AuthContext.tsx`
Defines the auth contract:
- `user`, `isLoading`, `isAuthenticated`
- `login(email, password)`, `register(email, password, name?)`

#### `AuthProvider.tsx`
Implements the contract:
- **On mount:** Calls `/auth/me` to restore session (silent refresh happens server-side).
- **Login/Register:** Calls API, updates local + Redux state on success.
- **Loading state:** Shows spinner while session is being restored.
- **Dual state sync:** Keeps React Context and Redux store in sync.

---

### 8. Redux Auth Slice (`src/store/authSlice.ts`) `[NEW]`

Global auth state with three status phases:

| Status       | Meaning                             |
| :----------- | :---------------------------------- |
| `active`     | User is logged in, tokens are valid |
| `refreshing` | Token refresh is in progress        |
| `expired`    | Session has ended                   |

Actions: `login`, `logout`, `setAuthStatus`

---

### 9. Login Page (`src/pages/LoginPage.tsx`) `[NEW]`

Full authentication UI with:
- **Dual-mode form:** Toggle between Login and Register.
- **OAuth integration:** GitHub login button.
- **Form fields:** Email, Password, Name (register only).
- **Error handling:** Displays server-side error messages.
- **Post-login redirect:** Returns user to the page they were trying to access.

---

### 10. Protected Route (`src/components/ProtectedRoute.tsx`) `[NEW]`

Route guard component:
- Checks `isAuthenticated` from auth context.
- **Unauthenticated:** Redirects to `/login` with `state.from` for return navigation.
- **Authenticated:** Renders children.

---

### 11. App Routing (`src/App.tsx`) `[MODIFIED]`

Restructured to wrap the app in `AuthProvider` and protect routes:

```
<Provider store={store}>
  <QueryClientProvider>
    <AuthProvider>               ← Session restoration
      <BrowserRouter>
        /login      → <LoginPage />
        /           → <ProtectedRoute><HomePage /></ProtectedRoute>
        /:id        → <ProtectedRoute><ContainerDetailsPage /></ProtectedRoute>
      </BrowserRouter>
    </AuthProvider>
  </QueryClientProvider>
</Provider>
```

---

### 12. API Client (`src/api/index.ts`) `[MODIFIED]`

Enhanced with **cross-tab safe token refresh:**
- Uses `navigator.locks.request('refresh_token_lock')` — ensures only **one** refresh request fires across all browser tabs.
- On 401 response → acquires lock → calls `/auth/refresh` → retries original request.
- Prevents thundering herd of refresh calls from multiple tabs/components.

---

### 13. Server Startup (`src/index.js`) `[MODIFIED]`

- Added `cookie-parser` middleware (required for reading HttpOnly cookies).
- Simplified startup log output for cleaner console.

---

## 🧪 Verification

Verified via `verify_refresh.js` sandbox script:

| Test Case                    | Result                                     |
| :--------------------------- | :----------------------------------------- |
| Generate refresh token       | ✅ Token created, stored with hash          |
| Verify token in DB           | ✅ Found by hash, expiry set (7 days)       |
| Rotate to new token          | ✅ Old revoked, new inherits family + TTL   |
| Old token marked replaced    | ✅ `replacedByTokenHash` set                |
| Absolute lifetime preserved  | ✅ New token expires at same time as old    |
| **Reuse detection (replay)** | ✅ Revoked token triggers family revocation |
| **Family-wide revocation**   | ✅ All tokens in family killed              |

---

## 🔐 Security Model

```
┌─────────────────────────────────────────────────────┐
│                   Login / Register                   │
│  → Access Token (JWT, 30min, HttpOnly cookie)        │
│  → Refresh Token (opaque, 7-day, restricted cookie)  │
└──────────────────────┬──────────────────────────────┘
                       │
           ┌───────────▼───────────┐
           │   API Request Flow     │
           │                        │
           │  1. Send access_token  │
           │  2. Expired?           │
           │     → /auth/refresh    │
           │     → Rotate tokens    │
           │     → Retry request    │
           │  3. Refresh expired?   │
           │     → Redirect /login  │
           └───────────┬────────────┘
                       │
           ┌───────────▼───────────┐
           │   Replay Attack?       │
           │                        │
           │  Revoked token used    │
           │  → Kill ENTIRE family  │
           │  → Force re-login      │
           └────────────────────────┘
```

---

## 📁 Files Changed

### New Files (9)
| File                                              | Purpose                             |
| :------------------------------------------------ | :---------------------------------- |
| `server/src/models/RefreshToken.js`               | Refresh token Mongoose model        |
| `server/src/controllers/auth.controller.js`       | Auth endpoint handlers              |
| `server/src/middlewares/authStatus.middleware.js` | Silent session restoration          |
| `server/sandbox/verify_refresh.js`                | Token lifecycle verification script |
| `dashboard/src/context/AuthContext.tsx`           | Auth type definitions + hook        |
| `dashboard/src/context/AuthProvider.tsx`          | Session state management            |
| `dashboard/src/pages/LoginPage.tsx`               | Login/Register UI                   |
| `dashboard/src/components/ProtectedRoute.tsx`     | Route guard                         |
| `dashboard/src/store/authSlice.ts`                | Redux auth state                    |

### Modified Files (31)
Key modifications across server and dashboard — auth middleware, JWT utilities, routes, API client, app routing, cookie parsing, and startup logging.

---

## 📅 What's Next? (Day 37)

### Day 37 — Frontend Auth Polish & Intelligence Integration

### Why this day exists
The auth system works — now make it **shine** in the UI and connect it to existing features.

### Frontend
* Role-aware UI: Disable/hide controls based on `permissions` from API
* Session expiry countdown + graceful logout flow
* "Remember me" toggle using device-bound tokens
* Toast notifications for auth events (login, session expired, etc.)

### Backend
* Rate limiting on `/auth/login` and `/auth/register`
* Brute-force detection with progressive delays
* Audit log for auth events (login, refresh, logout, revocation)

✅ Outcome: **Auth that users trust and admins can monitor**
