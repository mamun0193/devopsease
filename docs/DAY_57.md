# 📅 Day 57 — Secure Temporary Container Port Exposure

Temporary public HTTPS tunnels for container ports — time-bound, auto-expiring, quota-enforced, with auto-revocation on container stop and a full audit trail.

---

## 🎯 Objective

- Let users expose a running container's port as a temporary public HTTPS URL.
- Enforce a hard quota of 3 active tunnels per user.
- Auto-expire tunnels at the requested duration (15m – 6h).
- Auto-revoke tunnels when the container stops or is removed.
- Keep the tunnel provider swappable behind a clean interface.

---

## 🔐 Backend

### Tunnel Model — `models/tunnel.model.js` *(new)*
- Fields: `userId`, `containerId`, `internalPort`, `publicUrl`, `provider`, `providerTunnelId`, `status` (`ACTIVE` / `EXPIRED` / `REVOKED`), `expiresAt`, `revokedAt`.
- Indexes on `userId`, `status`, `expiresAt`, and `(containerId, status)`.

### Provider Interface — `services/providers/tunnelProvider.interface.js` *(new)*
- Abstract base class: `createTunnel(targetHost, port)` and `closeTunnel(providerTunnelId)`.
- All provider implementations extend this — service code never imports ngrok directly.

### Ngrok Provider — `services/providers/ngrokTunnelProvider.js` *(new)*
- Uses the official `@ngrok/ngrok` SDK. Reads `NGROK_AUTH_TOKEN` from env — never logged.
- `closeTunnel` swallows errors gracefully (tunnel may already be closed on provider side).

### Tunnel Service — `services/tunnel.service.js` *(new)*
- **`createTunnel`** — validates duration allowlist, verifies container ownership, inspects Docker for host-mapped port, enforces 3-tunnel quota, calls provider, saves record, fires audit.
- **`revokeTunnel`** — ownership-scoped, closes provider tunnel, marks `REVOKED`.
- **`getUserTunnels`** — sorted newest-first, `providerTunnelId` never returned.
- **`expireTunnelsJob`** — safe for `setInterval`, full try/catch, closes and marks expired tunnels.
- **`revokeByContainer`** — non-throwing, called on container stop/delete/Docker event.

### Tunnel Audit — `services/tunnel.audit.js` *(new)*
- Fire-and-forget logging to `SecurityLog` for `TUNNEL_CREATED`, `TUNNEL_REVOKED`, `TUNNEL_EXPIRED`.

### Routes — `routes/tunnel.routes.js` *(new)*
| Method | Path           | Description               |
| ------ | -------------- | ------------------------- |
| POST   | `/tunnels`     | Create a temporary tunnel |
| GET    | `/tunnels`     | List user's tunnels       |
| DELETE | `/tunnels/:id` | Revoke an active tunnel   |

### Integrations *(modified)*
- **`index.js`** — Mounts `/tunnels`, initializes provider, starts 60s expiry scheduler.
- **`containers.routes.js`** — Auto-revokes tunnels on container stop and delete.
- **`docker/events.js`** — Auto-revokes on Docker `stop`/`die` events (catches external CLI stops).
- **`envValidator.js`** — Warns on startup if `NGROK_AUTH_TOKEN` is unset.

---

## 🖥️ Frontend

### `hooks/useTunnels.ts` *(new)*
- `useUserTunnels(containerId?)` — polls every 30s, filtered by container.
- `useCreateTunnel()` — maps `400`/`429`/`403` to specific error toasts.
- `useRevokeTunnel()` — info toast on success. All hooks use Redux `addToast`.

### `components/tunnels/ExposePortModal.tsx` *(new)*
- Port dropdown from live inspect data (only host-mapped ports shown).
- Duration button grid: 15 min / 30 min / 1 hour / 2 hours / 6 hours.
- Quota warning banner at 3 active tunnels. No-port info banner if no bindings exist.

### `components/tunnels/TunnelTable.tsx` *(new)*
- Per-row live countdown timer (1s tick). Turns amber when under 5 minutes.
- Copy-to-clipboard button for public URL. Status badges: emerald / amber / slate.
- Revoke button disabled for non-ACTIVE tunnels. Auto-refetch triggered on expiry.

### `ContainerDetailsPage.tsx` *(modified)*
- Added **Public Access** tab with Globe icon.
- Expose Port button disabled when container not running or at quota.
- Quota pill shows `N / 3 tunnels active`, turns amber at limit.

---

## 🛡️ Security

- Container ownership verified before every tunnel create — no cross-tenant exposure.
- Port validated against live Docker inspect — internal IP never returned.
- Duration allowlisted server-side — client cannot bypass.
- `NGROK_AUTH_TOKEN` never logged at any level.
- Three-layer auto-revocation: API stop/delete route, Docker event stream, 60s scheduler.

---

## ✅ Outcome

> Users get a Railway-style Public Access tab in every container detail page — expose a port, get a live-countdown HTTPS URL, copy it, and revoke at any time. Quota, expiry, and auto-revocation are all enforced server-side with a full audit trail.

---

## 🔮 What's Next

📅 Day 58 — Container Resource Limits & Quota Governance

- Per-user CPU and memory limits enforced at container creation
- Quota model tracking allocated vs. used resources
- Resource limit configuration UI in Create Container modal

Outcome:

> Users operate within defined resource envelopes. Admins control limits per plan tier.
