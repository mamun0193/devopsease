# Day 84 — Unified Kubernetes Dashboard

## Overview

Built a unified dashboard that aggregates **pods, deployments, and services** from a live Kubernetes cluster into a single screen. Supports cluster and namespace selection, auto-refreshes every 10 seconds, and surfaces all resource health state with color-coded indicators.

This becomes the main control panel for the platform's Kubernetes integration — the base for all future cluster observability features.

---

## Backend

### `k8sDashboard.service.js` — NEW

Single exported function: `getClusterOverview(kubeConfig, namespace = 'default')`

- Creates `CoreV1Api` and `AppsV1Api` clients from the kubeconfig
- Fetches all three resource types **in parallel** via `Promise.all` — latency = slowest call, not sum
- Maps raw K8s API objects to clean, serialization-safe shapes (no internal metadata leaked)
- Applies consistent error normalization for auth, connection, timeout, and namespace-not-found scenarios

| Resource | K8s API Call |
|----------|-------------|
| Pods | `CoreV1Api.listNamespacedPod` |
| Services | `CoreV1Api.listNamespacedService` |
| Deployments | `AppsV1Api.listNamespacedDeployment` |

### `cluster.service.js` — MODIFIED

Added `getClusterOverview(userId, clusterId, namespace)`:
1. Calls `assertClusterOwnership` — verifies the cluster belongs to the requesting user and is in `connected` state
2. Decrypts the stored kubeconfig via `decrypt()`
3. Delegates to `k8sDashboard.service.getClusterOverview`

### `cluster.controller.js` — MODIFIED

Added `getClusterOverviewAction` — reads `clusterId` from `req.params.id` and `namespace` from `req.query.namespace` (defaults to `"default"`), returns overview JSON directly.

### `cluster.routes.js` — MODIFIED

```
GET /api/clusters/:id/overview?namespace=default
```

Full route table after Day 84:

| Method | Path | Description |
|--------|------|-------------|
| POST | `/connect` | Connect a cluster |
| GET | `/` | List user clusters |
| GET | `/:id/pods` | List pods |
| GET | `/:id/pods/:podName/logs` | Pod logs |
| GET | `/:id/namespaces` | List namespaces |
| POST | `/:id/namespaces` | Create namespace |
| DELETE | `/:id/namespaces/:name` | Delete namespace |
| POST | `/:id/deployments/:name/scale` | Scale deployment |
| **GET** | **`/:id/overview`** | **Cluster overview ← NEW** |

---

## Frontend

### `api/index.ts` — MODIFIED

Added types: `K8sDashboardPod`, `K8sDashboardService`, `K8sDashboardDeployment`, `K8sClusterOverview`  
Added method: `clusterApi.getOverview(clusterId, namespace)` → `GET /api/clusters/:id/overview`

### `useClusters.ts` — MODIFIED

Added `useClusterOverview(clusterId, namespace)`:
- `enabled` only when `clusterId` is present
- `staleTime: 8_000` — prevents redundant refetches within 8s
- `refetchInterval: 10_000` — live auto-refresh every 10 seconds

### `KubernetesDashboardPage.tsx` — NEW (route: `/kubernetes/dashboard`)

**Controls:** Cluster selector (connected clusters only, auto-selects first) + Namespace selector (populated from live namespaces, resets on cluster switch) + Manual refresh button

**Summary cards:** Total Pods · Deployments · Services — each with gradient icon and animated count

**Pods table:** name (monospace) · status badge (Running=green, Pending=amber, Failed=red, Succeeded=blue) · restarts (amber if `> 0`) · human-readable age

**Deployments table:** name · desired replicas · `available/desired` count (green if fully available, amber if degraded) · age

**Services table:** name · type badge (ClusterIP / NodePort / LoadBalancer) · port mappings in `port→targetPort/PROTOCOL` format

**UX:** Pulsing live indicator · error banner on API failure · empty state with link to Clusters page · Framer Motion stagger animations

---

## Response Shape

```json
{
  "pods":        [{ "name": "api-6f9d8", "status": "Running", "restarts": 0, "age": "2026-04-09T..." }],
  "services":    [{ "name": "api-svc", "type": "ClusterIP", "clusterIP": "10.96.0.1", "ports": [{ "port": 80, "targetPort": 3000, "protocol": "TCP" }] }],
  "deployments": [{ "name": "api", "replicas": 3, "availableReplicas": 3, "age": "2026-04-09T..." }]
}
```

---

## Error Handling

| Scenario | Status | Code |
|----------|--------|------|
| Cluster not found | 404 | `CLUSTER_NOT_FOUND` |
| Not cluster owner | 403 | `CLUSTER_FORBIDDEN` |
| Cluster not connected | 422 | `CLUSTER_UNAVAILABLE` |
| Namespace not found | 404 | `NAMESPACE_NOT_FOUND` |
| K8s auth failure | 401/403 | `K8S_API_ERROR` |
| Cannot reach cluster | 502 | `K8S_API_ERROR` |
| Connection timeout | 504 | `K8S_API_ERROR` |

---

## ✅ Outcome

→ Full cluster resource state visible in one screen  
→ Namespace switching works with live namespace list  
→ Replica health shown as `available/desired` with color coding  
→ Auto-refresh keeps data current without user action  
→ Parallel API fetching keeps load time minimal  

## What's Next

📅 **Day 85 — Pipeline System (Structure + Parsing)**

- Create pipeline structure and parsing

**🎯 Goal**
Learn about pipeline system (YAML parsing, config driven saystem and pipeline abstraction)