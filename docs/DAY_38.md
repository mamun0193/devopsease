# Day 38 — UX Refinements, Navigation Fixing & Data Accuracy

> **Focus:** User Experience, Navigation Flow, Data Integrity
> **Core Principle:** "Seamless navigation and accurate implementation details."

---

## 🎯 Goal

Refine the application's navigation flow for authenticated users, ensure critical container data (timestamps, ports) is accurate across all states, and improve the terminal experience.

- **Navigation:** Seamless transition between Landing Page and Dashboard.
- **Data Integrity:** Correct handling of container creation times and port mappings.
- **Usability:** distinct shell preference (Bash > Sh) and working "Back" buttons.

---

## 🛡️ Key Technical Changes

### 1. Navigation & Routing `[MODIFIED]`

| Feature                 | Implementation Details                                                            |
| :---------------------- | :-------------------------------------------------------------------------------- |
| **Landing Page Access** | Authenticated users can now view the Landing Page (previously redirected).        |
| **Dynamic Navbar**      | Navbar adapts: shows "Go to Dashboard" for logged-in users, "Sign In" for guests. |
| **Back Navigation**     | Fixed `ContainerDetails` back buttons to point correctly to `/dashboard`.         |

### 2. Container Data Accuracy `[FIXED]`

- **Creation Timestamp:** Switched from using `StartedAt` to `Created` date.
  - *Fixes:* Containers showing "54 years ago" (Unix Epoch) when created but never started.
- **Port Mappings:** 
  - Refactored backend to correctly format ports as an array for the frontend.
  - Added fallback to `HostConfig.PortBindings` for stopped/created containers.
  - *Result:* Ports are now visible even if the container isn't running.

### 3. Terminal Experience `[IMPROVED]`

- **Shell Priority:** Updated WebSocket handler to prioritize `/bin/bash` or `bash` before falling back to `sh`.
- **Environment:** Explicitly setting `SHELL` env var in exec sessions.

---

## 📁 Files Changed

### Modified Files
| File                                                | Changes                                                           |
| :-------------------------------------------------- | :---------------------------------------------------------------- |
| `dashboard/src/App.tsx`                             | Removed `PublicRoute` wrapper from Landing Page.                  |
| `dashboard/src/pages/LandingPage.tsx`               | Added conditional Logic for "Dashboard" vs "Get Started" buttons. |
| `dashboard/src/components/LandingLayout.tsx`        | Updated Navbar auth state logic and links.                        |
| `dashboard/src/components/ContainerDetailsPage.tsx` | Fixed routing for Back arrow and 404 page buttons.                |
| `server/src/websocket/execHandler.js`               | Implemented Bash preference logic in `findAvailableShell`.        |
| `server/src/services/containerCache.service.js`     | Fixed `ports` parsing and added `created` timestamp field.        |
| `server/src/routes/containers.routes.js`            | Mapped new `created` field in API response.                       |

---

## 🧪 Verification

| Test Case                   | Result                                                            |
| :-------------------------- | :---------------------------------------------------------------- |
| **Auth User Landing Page**  | ✅ Sees "Go to Dashboard" instead of Login buttons.                |
| **Container Back Btn**      | ✅ Navigates to `/dashboard` instead of `/`.                       |
| **Created Container Date**  | ✅ Shows actual creation time (e.g., "2 mins ago") not "54 years". |
| **Stopped Container Ports** | ✅ Port mappings are visible even when container is stopped.       |
| **Terminal Shell**          | ✅ Defaults to `bash` if available in the container.               |

---

## 📅 What's Next?

### Day 39 — System Observability Foundation

**Focus:** Visibility

**Backend:**
* Metrics registry (in-memory counters)
* Track:
  * `activeWebSockets`
  * `activeExecSessions`
  * `tokenRefreshCount`
  * `failedLogins`
  * `rateLimitHits`
* `/health` endpoint
* `/metrics` endpoint

**Frontend (Admin-lite):**
* System uptime
* Active sessions
* High severity audit events

**Outcome:**
> You can see your system breathe.
