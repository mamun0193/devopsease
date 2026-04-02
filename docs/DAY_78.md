# Day 78 — Kubernetes Cluster Integration and Connection

## Overview

Introduced **Kubernetes cluster support** to DevOpsEase. Users can now connect any Kubernetes cluster by pasting a kubeconfig, and the backend can authenticate, verify, and interact with it — listing pods and namespaces. Kubeconfig is encrypted at rest using AES-256-GCM. This is the foundation layer for replacing Docker-based deployments with Kubernetes orchestration.

---

## Delivered Scope

### 1. Dependency (`server/package.json`)
* Installed `@kubernetes/client-node` — the official Kubernetes client for Node.js.

### 2. Cluster Model (`server/src/models/cluster.model.js`) — **NEW**
* Fields: `userId` (ref: User), `name`, `kubeconfig` (AES-256-GCM encrypted), `status` (`connected` | `failed`), `lastError`.
* `toSafeJSON()` method strips the `kubeconfig` field before any serialisation — never returned over the wire.
* Indexes: compound `{ userId, name }` (unique per user) + `{ userId, createdAt }` for sorted listing.

### 3. Kubernetes Client Service (`server/src/services/k8sClient.service.js`) — **NEW**
Stateless utility layer — every function takes a `KubeConfig` instance, no shared state:

| Function | Behaviour |
|---|---|
| `loadKubeConfig(kubeconfigString)` | Parses YAML string → validates clusters + contexts exist → returns `KubeConfig` |
| `getCoreClient(kubeConfig)` | Returns `CoreV1Api` client |
| `listPods(kubeConfig, namespace)` | Lists pods with shaped output: name, status, ready, restarts, containers |
| `listNamespaces(kubeConfig)` | Lists all namespaces with name, status, labels |

* Error normalisation: auth failures, ECONNREFUSED, timeouts → mapped to user-friendly messages. Bearer tokens redacted from all error output.

### 4. Cluster Service (`server/src/services/cluster.service.js`) — **NEW**
Business logic layer with full ownership validation:

| Function | Flow |
|---|---|
| `connectCluster({ userId, name, kubeconfig })` | Validate input → duplicate check → parse kubeconfig → **test connection (listNamespaces)** → encrypt → save. Failed states persisted with `lastError` so users can see what went wrong. |
| `getUserClusters(userId)` | Returns clusters sorted by `createdAt` desc, kubeconfig excluded via `select('-kubeconfig')`. |
| `getClusterPods(userId, clusterId, namespace)` | Asserts ownership → decrypts kubeconfig → calls `listPods()`. Namespace safely defaults to `"default"` if falsy. |
| `getClusterNamespaces(userId, clusterId)` | Asserts ownership → decrypts kubeconfig → calls `listNamespaces()`. |

* `assertClusterOwnership()` guards every read operation — 404 if not found, 403 if wrong user, 422 if cluster status is `failed`.

### 5. Controller (`server/src/controllers/cluster.controller.js`) — **NEW**
Four handlers following existing `try/catch → next(error)` conventions:
* `connectClusterAction` — returns `201` on first-time `connected`, `200` on `failed` (saved but didn't connect).
* `getClusters`, `getClusterPodsAction`, `getClusterNamespacesAction`.

### 6. Routes (`server/src/routes/cluster.routes.js`) — **NEW**
All four routes behind `authMiddleware`. Mounted at `/api/clusters` in `index.js`.

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/clusters/connect` | Connect a new cluster |
| `GET` | `/api/clusters` | List user's clusters |
| `GET` | `/api/clusters/:id/pods` | List pods (`?namespace=default`) |
| `GET` | `/api/clusters/:id/namespaces` | List namespaces |

### 7. Dashboard API Layer (`dashboard/src/api/index.ts`)
* Added TypeScript interfaces: `K8sCluster`, `K8sPod`, `K8sPodContainer`, `K8sNamespace`.
* Added `clusterApi` with `connect`, `list`, `getPods`, `getNamespaces`.

### 8. React Hook (`dashboard/src/hooks/useClusters.ts`) — **NEW**
* `useClusters()` — React Query with 30s stale time.
* `useConnectCluster()` — mutation that invalidates the cluster list on success.

### 9. Clusters Page (`dashboard/src/pages/ClustersPage.tsx`) — **NEW**
* Filter pills (Total / Connected / Failed) + 3 summary cards.
* Two-column layout: connect form on left, cluster list on right.
* Inline result feedback: Connected ✅ / Failed ❌ with error message.
* Encrypted-at-rest note displayed beneath the kubeconfig textarea.
* Animated with `framer-motion`, consistent with the rest of the dashboard.
* `"Clusters"` tab added to `ResourceNav` with the `Cloud` icon, between Deployments and Images.
* Protected route at `/clusters` registered in `App.tsx`.

---

## Security Decisions

| Concern | Implementation |
|---|---|
| Kubeconfig at rest | AES-256-GCM via existing `encrypt()`/`decrypt()` from `utils/encryption.js` |
| Kubeconfig in transit | Never returned in API responses — stripped by `toSafeJSON()` and `select('-kubeconfig')` |
| Kubeconfig in logs | Never logged. Error messages sanitise bearer tokens with regex redaction |
| Ownership | `assertClusterOwnership()` validates `userId` before every operation |
| Failed connections | Persisted with `status: "failed"` and `lastError` — no silent swallowing |

---

## Constraints Respected

* **Zero modifications** to existing deployment logic, Docker services, or any other service file.
* Only additive changes to `index.js` (route mount), `App.tsx` (route), `api/index.ts` (types + api), and `ResourceNav.tsx` (tab).

---

## ✅ Outcome

The backend can now securely connect to any Kubernetes cluster via kubeconfig, test the connection, and query live cluster data (pods, namespaces). Kubeconfig is encrypted before hitting the database. The dashboard exposes a clean, minimal connect UI with animated success/failure feedback.

Calling `listPods("default")` on a connected cluster returns real pod data from that cluster.

## What's Next

📅 **Day 79 — Namespace magangement**

- Build namespace service 
- Support multi-project isolation


# 📅 Day 79 — Namespace Management

## 🎯 Goal

👉 1 repo = 1 namespace (simple rule)
