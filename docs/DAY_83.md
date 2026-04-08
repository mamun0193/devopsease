# Day 83 — Kubernetes Deployment Scaling

## Overview

Extended the Kubernetes integration with **real-time deployment scaling** — allowing users to dynamically adjust the number of running replicas for any deployment within a live cluster.

Users can now scale workloads up or down by sending a single API call. The system validates ownership, reads the current deployment state, and patches it using the Kubernetes `AppsV1Api` — reflecting changes immediately in pod count.

---

## Delivered Scope

### 1. Scale Service (`server/src/services/k8sScale.service.js`) — **NEW**

Standalone low-level Kubernetes service with a single exported function:

- `scaleDeployment(kubeConfig, namespace, deploymentName, replicas)`

**Implementation approach:**
1. Validates replica count (integer, `>= 1`, `<= 10`)
2. Reads the existing deployment via `AppsV1Api.readNamespacedDeployment` (validates existence, captures `previousReplicas`)
3. Applies a `PATCH` using `AppsV1Api.patchNamespacedDeployment` with strategy `application/merge-patch+json`
4. Returns structured result with old and new replica counts

**Patch payload:**
```json
{ "spec": { "replicas": 3 } }
```

**Response shape:**
```json
{
  "name": "my-app",
  "namespace": "default",
  "replicas": 3,
  "previousReplicas": 1,
  "availableReplicas": 1,
  "updatedAt": "2026-04-08T01:50:00Z"
}
```

**Enforced limits:**
- Min replicas: `1`
- Max replicas: `10` (`MAX_REPLICAS` constant)

---

### 2. Cluster Service Extension (`server/src/services/cluster.service.js`) — **MODIFIED**

Added:
- `scaleDeployment(userId, clusterId, namespace, deploymentName, replicas)`

Flow:
1. Validate cluster ownership (existing `assertClusterOwnership` helper)
2. Decrypt kubeconfig
3. Delegate to `k8sScale.service.js`
4. Log old → new replica count with cluster context

---

### 3. Controller (`server/src/controllers/cluster.controller.js`) — **MODIFIED**

Added:
- `scaleDeploymentAction`

Extracts from request:
- `clusterId` — from `req.params.id`
- `deploymentName` — from `req.params.name`
- `namespace` — from `req.body` (default: `"default"`)
- `replicas` — from `req.body` (required, validated)

Returns:
```json
{
  "message": "Deployment scaled successfully",
  "replicas": 3,
  "previousReplicas": 1,
  "deployment": "my-app",
  "namespace": "default",
  "availableReplicas": 1
}
```

---

### 4. Route (`server/src/routes/cluster.routes.js`) — **MODIFIED**

Added endpoint:
- `POST /api/clusters/:id/deployments/:name/scale`

**Full cluster route table:**

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/connect` | Connect a cluster |
| GET | `/` | List user clusters |
| GET | `/:id/pods` | List pods in namespace |
| GET | `/:id/pods/:podName/logs` | Fetch pod logs |
| GET | `/:id/namespaces` | List namespaces |
| POST | `/:id/namespaces` | Create namespace |
| DELETE | `/:id/namespaces/:name` | Delete namespace |
| **POST** | **`/:id/deployments/:name/scale`** | **Scale deployment** ← NEW |

---

## API Usage

**Request:**
```http
POST /api/clusters/:clusterId/deployments/:deploymentName/scale
Content-Type: application/json
Authorization: Bearer <token>

{
  "namespace": "default",
  "replicas": 3
}
```

**Success (200):**
```json
{
  "message": "Deployment scaled successfully",
  "replicas": 3,
  "previousReplicas": 1,
  "deployment": "my-app",
  "namespace": "default",
  "availableReplicas": 1
}
```

**Verify with kubectl:**
```bash
kubectl get pods -n default
kubectl get deployment my-app -n default
```

---

## Error Handling

| Scenario | HTTP Status | Error Code |
|----------|------------|------------|
| `replicas` missing from body | 400 | `VALIDATION_ERROR` |
| Replica count `< 1` or non-integer | 400 | `INVALID_REPLICAS` |
| Replica count `> 10` | 400 | `REPLICA_LIMIT_EXCEEDED` |
| Deployment not found | 404 | `DEPLOYMENT_NOT_FOUND` |
| Cluster not found | 404 | `CLUSTER_NOT_FOUND` |
| Not owner of cluster | 403 | `CLUSTER_FORBIDDEN` |
| Cluster not connected | 422 | `CLUSTER_UNAVAILABLE` |
| K8s auth failure | 401/403 | `K8S_API_ERROR` |
| Connection refused | 502 | `K8S_API_ERROR` |
| Connection timeout | 504 | `K8S_API_ERROR` |

---

## Design Decisions

- **Read-before-patch** — fetches the current deployment before patching to validate existence and record `previousReplicas` in audit logs
- **Merge-patch strategy** — patches only `spec.replicas`, leaving all other deployment config untouched
- **Max replica limit (10)** — safety rail against accidental over-scaling; defined as a named constant for easy adjustment
- **YAML generator untouched** — scaling and YAML generation are fully independent concerns; no cross-contamination

---

## Constraints Respected

- YAML generator not modified
- Deployment build logic not modified
- Only live deployment patching — no model or DB changes
- Modular architecture: `k8sScale.service` → `cluster.service` → `controller` → `route`
- All endpoints validate cluster ownership before any K8s operation

---

## ✅ Outcome

→ Scale any deployment up or down via a single API call  
→ Pod count reflects changes immediately in the cluster  
→ Verifiable with `kubectl get pods`  
→ Audit log captures old → new replica count per scaling action  
→ Safety limit prevents runaway replica creation  

---

## What's Next

📅 **Day 84 — Kubernetes Dashboard**

- Build a dashboard to visualize Kubernetes resources

**🎯 Goal**
A dashboard is present there to visualize everything  
