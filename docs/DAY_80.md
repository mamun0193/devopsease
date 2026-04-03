# Day 80 — Kubernetes Deployment YAML Generator

## Overview

Extended the Kubernetes integration layer with a **Deployment YAML generation API**.

The backend now converts validated user input into a Kubernetes Deployment manifest YAML string, without applying it to a cluster yet.

This is the first step toward Kubernetes-native app deployments that can replace the current Docker-only runtime path.

---

## Delivered Scope

### 1. Deployment Generator Service (`server/src/services/k8sDeployment.service.js`) — **NEW**
Implemented:
- `generateDeploymentYaml({ name, image, replicas = 1, namespace = "default", env = [], containerPort = 3000, resources })`

What it does:
- validates inputs
- builds a Kubernetes Deployment object
- converts object to YAML using `js-yaml`
- returns YAML string output

Manifest shape generated:
- `apiVersion: apps/v1`
- `kind: Deployment`
- `metadata.name`
- `metadata.namespace`
- `spec.replicas`
- `spec.selector.matchLabels`
- `spec.template.metadata.labels`
- `spec.template.spec.containers[]`

---

### 2. Labels + Selector Convention
Implemented `app: <name>` convention consistently in:
- deployment metadata labels
- selector `matchLabels`
- pod template labels

This ensures selector and pod labels always match.

---

### 3. Environment Variable Mapping
Supported input format:

```json
[
  { "key": "PORT", "value": "3000" }
]
```

Mapped to Kubernetes format:

```yaml
env:
  - name: PORT
    value: "3000"
```

Also validates env entries for key/value correctness before generation.

---

### 4. Validation Rules Implemented
Generator enforces:
- deployment `name` must be lowercase DNS-compliant label
- `namespace` must be lowercase DNS-compliant label
- `image` is required
- `replicas` must be integer `>= 1`
- `containerPort` must be integer in valid port range

Clean validation errors are returned for invalid input.

---

### 5. API Controller (`server/src/controllers/k8s.controller.js`) — **NEW**
Added:
- `generateDeploymentYamlAction`

Behavior:
- receives POST body
- calls generator service
- returns:

```json
{
  "yaml": "<generated yaml string>"
}
```

---

### 6. API Route (`server/src/routes/k8s.routes.js`) — **NEW**
Added secured endpoint:

- `POST /api/k8s/deployments/generate`

Route uses existing `authMiddleware`.

---

### 7. Server Wiring (`server/src/index.js`)
Mounted the new route group:
- `app.use("/api/k8s", k8sRoutes)`

No deployment execution is performed in this step.

---

## Constraints Respected

- No cluster deployment execution added (generation only)
- Existing Kubernetes connection/namespace logic unchanged
- Modular architecture maintained (service + controller + route)

---

## ✅ Outcome

The platform can now:

→ accept deployment inputs
→ generate valid Kubernetes Deployment YAML
→ return YAML for future `kubectl apply`/cluster deployment workflows

This completes Day 80’s objective and unlocks the next phase: manifest-driven deployment orchestration.

---

## What’s Next

📅 **Day 81 — Service + Ingress**
- Extend YAML generator to support Service and Ingress manifest generation
- Implement corresponding API endpoints and controller actions
