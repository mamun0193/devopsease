# Day 82 — Kubernetes Pod Observability

## Overview

Extended the Kubernetes integration with **pod observability** — listing pods, tracking status, and retrieving logs from running workloads.

Users can now view all pods in a cluster namespace, monitor their health (Running, Pending, Failed), inspect restart counts, and debug issues using real-time log retrieval — all from the dashboard.

---

## Delivered Scope

### 1. Pod Service (`server/src/services/k8sPod.service.js`) — **NEW**

Standalone service with two functions:

- `getPods(kubeConfig, namespace)` — Lists all pods via `CoreV1Api.listNamespacedPod`
- `getPodLogs(kubeConfig, namespace, podName, options)` — Fetches logs via `CoreV1Api.readNamespacedPodLog`

**getPods returns structured response:**

```json
{
  "name": "pod-name",
  "namespace": "default",
  "status": "Running",
  "ready": true,
  "restarts": 3,
  "age": "2026-04-05T10:00:00Z",
  "nodeName": "node-1",
  "containers": [
    { "name": "app", "ready": true, "restarts": 2, "image": "nginx:latest", "state": {} }
  ]
}
```

**getPodLogs options:**
- `tailLines` (default: 100, max: 10000)
- `container` — for multi-container pods

Includes full error normalization: 404 (pod not found), 401/403 (auth), ECONNREFUSED, ETIMEDOUT.

---

### 2. Cluster Service Extension (`server/src/services/cluster.service.js`) — **MODIFIED**

Added:
- `getPodLogs(userId, clusterId, namespace, podName, options)`

Flow: validate ownership → decrypt kubeconfig → delegate to `k8sPod.service.js`

---

### 3. Controller (`server/src/controllers/cluster.controller.js`) — **MODIFIED**

Added:
- `getPodLogsAction` — extracts `clusterId`, `podName`, `namespace`, `tailLines`, `container` from request

---

### 4. Route (`server/src/routes/cluster.routes.js`) — **MODIFIED**

Added endpoint:
- `GET /api/clusters/:id/pods/:podName/logs`

Query params: `namespace` (default), `tailLines` (100), `container` (optional)

Full route table:

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/:id/pods` | List pods in namespace |
| GET | `/:id/pods/:podName/logs` | Fetch pod logs |

---

### 5. Dashboard API Client (`dashboard/src/api/index.ts`) — **MODIFIED**

Added:
- `clusterApi.getPodLogs(clusterId, podName, options)` — calls the new backend route with URL-encoded pod name

---

### 6. React Hooks (`dashboard/src/hooks/useClusters.ts`) — **MODIFIED**

Added three hooks:

| Hook | Behavior |
|------|----------|
| `useClusterPods(clusterId, namespace)` | Auto-refreshes every 30s |
| `useClusterNamespaces(clusterId)` | Cached for 60s |
| `usePodLogs(clusterId, podName, options)` | On-demand, manual refresh |

---

### 7. Pod Observability Page (`dashboard/src/pages/PodsPage.tsx`) — **NEW**

Full-featured UI with:

- **Cluster selector** — dropdown of connected clusters
- **Namespace selector** — dynamically loaded from cluster API
- **Summary cards** — Total, Running, Pending, Failed, Succeeded counts
- **Status filter pills** — quick-filter pods by phase
- **Pod list panel** — color-coded status badges, restart warnings, computed age, container breakdowns for multi-container pods
- **Logs viewer** — terminal-style split pane with:
  - Syntax-highlighted lines (errors red, warnings amber)
  - Line numbers
  - Container selector (multi-container pods)
  - Configurable tail lines (50 / 100 / 500 / 1000)
  - Manual refresh

---

### 8. Navigation (`dashboard/src/components/ResourceNav.tsx`) — **MODIFIED**

Added "Pods" tab after "Clusters" in the navigation bar.

### 9. Router (`dashboard/src/App.tsx`) — **MODIFIED**

Added protected route: `/pods` → `PodsPage`

---

## Error Handling

| Scenario | Response |
|----------|----------|
| Pod not found | 404 / `POD_NOT_FOUND` |
| Namespace not found | 404 via K8s API |
| Cluster not connected | 422 / `CLUSTER_UNAVAILABLE` |
| Auth failure | 401 or 403 / `K8S_API_ERROR` |
| Connection refused | 502 / `K8S_API_ERROR` |
| Timeout | 504 / `K8S_API_ERROR` |

---

## Constraints Respected

- No existing deployment/build logic modified
- Modular architecture maintained (service → controller → route)
- Stateless K8s client pattern preserved
- All endpoints validate cluster ownership before querying

---

## ✅ Outcome

→ View all pods in a cluster namespace with live status
→ Monitor pod health — Running, Pending, Failed, Succeeded
→ Track restart counts and pod age
→ Debug workloads using log retrieval
→ Support multi-container pods with container-level log selection

---

## What's Next

📅 **Day 83 — Scaling Deployments**

- Scale deployments using Kubernetes API
- Update deployment replicas

**🎯 Goal**
Control replicas via Kubernetes
