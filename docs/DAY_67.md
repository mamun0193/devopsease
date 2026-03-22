# Day 67 — GitHub Webhook Listener

## Overview

Implemented a secure GitHub webhook listener for DevOpsEase with route-scoped raw body parsing, HMAC SHA256 signature verification, push-event handling, repository matching, idempotency, and async pipeline trigger handoff.

---

## What Changed

| File | Change |
| --- | --- |
| `server/src/routes/webhook.routes.js` | **New** — Added `POST /api/webhooks/github` with `express.raw()` middleware scoped only to webhook route |
| `server/src/controllers/webhook.controller.js` | **New** — Added webhook controller with signature validation, idempotency (`x-github-delivery`), push-only filtering, repo matching, and async trigger placeholder |
| `server/src/helpers/githubSignature.helper.js` | **New** — Added hardened GitHub signature helper (`sha256=` format checks + `timingSafeEqual`) |
| `server/src/index.js` | Mounted `/api/webhooks` before global JSON parser to preserve raw request bytes for HMAC verification |
| `server/src/config/envValidator.js` | Added warning when `WEBHOOK_SECRET` is missing |

---

## Security + Reliability Notes

- Signature is verified using `x-hub-signature-256` and `WEBHOOK_SECRET`
- Payload JSON is parsed only after signature verification
- Duplicate deliveries are ignored via in-memory delivery tracking (`x-github-delivery`)
- Non-`push` events are ignored early for performance
- Unknown repositories are safely ignored with `200`
- Pipeline trigger is non-blocking (`setImmediate`) to keep webhook response fast

---

## Setup

### 1) Environment

Add the webhook secret to your server environment:

```env
WEBHOOK_SECRET=your_secret_key
```

### 2) Start Backend

Run the server normally from the backend service.

### 3) Configure GitHub Webhook

In the target GitHub repository:

- **Payload URL:** `http://<your-host>/api/webhooks/github`
- **Content type:** `application/json`
- **Secret:** same value as `WEBHOOK_SECRET`
- **Events:** Just the `push` event (recommended)

### 4) Verify Behavior

- Valid signed push event → `200 processed`
- Duplicate delivery id → `200 duplicate`
- Non-push event → `200 ignored`
- Invalid signature → `401 unauthorized`
- Invalid JSON payload (after valid signature) → `400`

---

## ✅ Outcome

DevOpsEase now accepts authenticated GitHub push webhooks safely and quickly, identifies connected repositories, and asynchronously hands off to pipeline execution logic.

---

## What's Next

📅 **Day 68 — Project Detection Engine**

- Create `projectDetector.service.js`
- Detect:
  - `Dockerfile`
  - `docker-compose.yml`
  - `package.json`
  - `requirements.txt`
- Output type:
  - `docker` / `compose` / `node` / `python`

✅ Outcome: Auto-detect how to build project
