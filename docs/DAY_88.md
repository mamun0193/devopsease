# Day 88 — DevOpsEase CLI Tool (Full Terminal Interface)

## Overview

Built a fully featured CLI (`devopsease` / `dse`) that gives developers terminal-first access to the entire DevOpsEase platform.
The CLI covers authentication, deployments, CI/CD pipelines, Kubernetes cluster management, Docker operations, secrets, tunnels, and observability — all from a single binary.
Designed for DX: coloured output, spinner feedback, interactive prompts, `--json` flag for scripting, and short-form aliases everywhere.

---

## Architecture

```
cli/
├── bin/
│   └── devopsease.js        ← Entry point, command registration, aliases
├── commands/
│   ├── auth.js              ← login / logout / whoami
│   ├── init.js              ← Project detection + pipeline scaffold
│   ├── doctor.js            ← Health/connectivity diagnostics
│   ├── config.js            ← Config management
│   ├── status.js            ← Cluster overview (pods + deployments + services)
│   ├── repo.js              ← Repository management
│   ├── deploy.js            ← Deployment lifecycle
│   ├── pipeline.js          ← CI/CD pipeline management
│   ├── build.js             ← Build management
│   ├── cluster.js           ← K8s cluster management
│   ├── namespace.js         ← Namespace management
│   ├── pods.js              ← Pod management + log streaming
│   ├── k8s.js               ← K8s deployments/services/ingress/YAML generation
│   ├── service.js           ← K8s service management
│   ├── ingress.js           ← Ingress management
│   ├── scale.js             ← Deployment scaling
│   ├── logs.js              ← Cross-resource log viewer
│   ├── container.js         ← Docker container management
│   ├── image.js             ← Docker image management
│   ├── network.js           ← Docker network management
│   ├── volume.js            ← Docker volume management
│   ├── registry.js          ← Container registry management
│   ├── project.js           ← Project management
│   ├── secrets.js           ← Secret management
│   └── tunnel.js            ← Public tunnel management
└── utils/
    ├── api.util.js          ← Axios client with auth injection + error mapping
    ├── config.util.js       ← ~/.devopsease/config.json read/write
    └── output.util.js       ← Tables, spinners, colours, formatters
```

---

## `package.json` — CLI Package

| Field | Value |
|-------|-------|
| Name | `devopsease-cli` |
| Binaries | `devopsease` and `dse` → `bin/devopsease.js` |
| Module type | ES Module (`"type": "module"`) |

**Dependencies:**

| Package | Role |
|---------|------|
| `commander` | Command parsing and sub-command tree |
| `inquirer` | Interactive prompts (lists, checkboxes, confirm) |
| `chalk` | Coloured terminal output |
| `cli-table3` | Formatted tables |
| `ora` | Spinner animations |
| `axios` | HTTP client for API calls |

---

## Utilities

### `utils/config.util.js` — NEW

Manages `~/.devopsease/config.json` — the single source of truth for CLI state.

| Export | Description |
|--------|-------------|
| `loadConfig()` | Reads config with safe fallback to defaults |
| `saveConfig(data)` | Deep-merges partial data and writes back |
| `requireAuth()` | Throws if no access token is stored |
| `requireCluster()` | Throws if no cluster is selected |
| `getNamespace()` | Returns current namespace or `default` |
| `clearAuth()` | Wipes access + refresh tokens |

Default config fields: `token`, `refreshToken`, `baseUrl` (`http://localhost:3497`), `currentProject`, `currentCluster`, `currentNamespace`.

### `utils/api.util.js` — NEW

Pre-configured Axios wrapper with:
- **Cookie injection** — attaches `access_token` and `refresh_token` cookies on every request
- **401 auto-retry** — retries once before clearing auth and surfacing a friendly error
- **Status code mapping** — 400/401/403/404/409/429/500 each produce a human-readable message
- **Network error handling** — `ECONNREFUSED`, `ENOTFOUND`, `ECONNABORTED` all give actionable messages

Exported helpers: `apiGet`, `apiPost`, `apiPut`, `apiDelete`, `getClient`, `getRawClient`.

### `utils/output.util.js` — NEW

Shared rendering layer used by every command.

| Export | Description |
|--------|-------------|
| `printTable(headers, rows)` | Unicode box-drawing table via `cli-table3` |
| `statusColor(status)` | Colour-codes status strings (green/cyan/red/yellow) |
| `withSpinner(label, fn)` | Wraps async calls with an `ora` spinner |
| `handleJsonOutput(opts, data)` | Prints JSON and returns `true` if `--json` flag is set |
| `formatDate(dateStr)` | Relative time (`5m ago`, `2h ago`, `3d ago`) or locale date |
| `truncate(str, maxLen)` | Clips strings with `…` suffix |
| `success / error / warn / info / dim / heading` | Semantic log helpers |

---

## `bin/devopsease.js` — Entry Point

Program metadata, version (`1.0.0`), and extended help text with Quick Start and Aliases sections.

Registers all 25 command modules and two shortcut aliases:

| Shortcut | Expands to |
|----------|-----------|
| `dse p` | `pod list` |
| `dse d` | `deploy list` |
| `dse s` | `status` |

Global error handler catches `commander` exceptions (help/version display, missing args) and exits cleanly.

---

## Command Modules

### `auth.js` — Authentication

| Command | Description |
|---------|-------------|
| `login` | Interactive email/password prompt → extracts `access_token` + `refresh_token` cookies → persists to config |
| `logout` | Clears stored tokens |
| `whoami` | Fetches `/auth/me` and displays name, email, role, plan |

### `init.js` — Project Init

Project-type detection scans the working directory for signature files:

| Type | Files detected |
|------|---------------|
| Node.js | `package.json` |
| Python | `requirements.txt`, `Pipfile`, `pyproject.toml`, `setup.py` |
| Go | `go.mod` |
| Java | `pom.xml`, `build.gradle`, `build.gradle.kts` |
| Rust | `Cargo.toml` |
| Docker | `Dockerfile` |

After detection, interactively prompts for repository, pipeline name, and step selection, then POSTs to `/api/pipelines` and prints next-step instructions.

### `doctor.js` — Diagnostics

Runs seven sequential health checks and prints `✔ / ✖` per item:

1. Configuration file loaded
2. API server reachable (`/health`)
3. Authentication token present
4. Token valid (`/auth/me`)
5. Cluster selected
6. Namespace set
7. Namespace exists in the selected cluster (live API call)

Exits with a green "All checks passed" or yellow "Some issues detected" summary.

### `config.js` — Configuration

| Command | Description |
|---------|-------------|
| `config show` | Displays all config fields (tokens are masked) |
| `config set-url <url>` | Updates the API base URL |
| `config set-project <id>` | Sets active project/repo ID |
| `config reset` | Deletes config file, restores defaults |

### `status.js` — Cluster Overview

Single command (`status` / `s`) fetches `/api/clusters/:id/overview` and renders three sections:
- **Pods** — name, status (colour-coded), restart count, age
- **Deployments** — name, ready/total replicas, up-to-date, available
- **Services** — name, type, cluster IP, port mappings

### `deploy.js` — Deployments

| Command | Description |
|---------|-------------|
| `deploy list` | Table of all deployments with status, env, image tag, commit hash |
| `deploy trigger` | Interactive repo + environment selection → triggers build/deploy |
| `deploy rollback <id>` | Confirm prompt → POST `/api/deployments/:id/rollback` |

### `pipeline.js` — CI/CD Pipelines

| Command | Description |
|---------|-------------|
| `pipeline list` | List all pipelines with status and repo |
| `pipeline create` | Interactive creation with repo + YAML steps |
| `pipeline run <id>` | Trigger execution |
| `pipeline status <id>` | Show execution status and step logs |
| `pipeline delete <id>` | Delete with confirmation |

### `pods.js` — Pod Management

| Command | Description |
|---------|-------------|
| `pod list` | Table: name, status, restarts, age, IP, node |
| `pod logs <name>` | Fetch with `--tail <n>`, `--follow` polls every 3s, `--container` for multi-container pods |
| `pod describe <name>` | Detailed view: metadata, containers table, container statuses, labels |
| `pods` | Shortcut alias for `pod list` |

### `k8s.js` — Kubernetes Operations

| Command | Description |
|---------|-------------|
| `k8s deploy list` | List K8s deployments |
| `k8s deploy create` | Interactive creation |
| `k8s deploy delete <name>` | Delete with confirmation |
| `k8s generate-yaml` | Generate deployment YAML (with secret injection) |
| `k8s service list` | List services in namespace |
| `k8s ingress list` | List ingress resources |

### `scale.js` — Scaling

```
devopsease scale <app> -r <replicas>
```
POSTs to `/api/clusters/:id/deployments/:name/scale` with the target replica count.

### `logs.js` — Global Log Viewer

```
devopsease logs <app>
```
Cross-resource log viewer — queries pod logs by app name, supports `--tail` and `--follow`.

### `cluster.js` / `namespace.js` — Cluster & Namespace Management

| Group | Commands |
|-------|---------|
| `cluster` | `list`, `connect`, `use <id>`, `disconnect <id>` |
| `ns` / `namespace` | `list`, `create <name>`, `delete <name>` |

### `container.js` — Docker Containers

| Command | Description |
|---------|-------------|
| `container list` | List running containers |
| `container start <id>` | Start a container |
| `container stop <id>` | Stop with confirmation |
| `container restart <id>` | Restart |
| `container remove <id>` | Remove with confirmation |
| `container logs <id>` | Fetch container logs |
| `container inspect <id>` | Full container detail |
| `container exec <id>` | Interactive command in container |

### `build.js` — Builds

| Command | Description |
|---------|-------------|
| `build list` | List builds with status |
| `build trigger` | Trigger a new build for a repo |
| `build logs <id>` | Stream build logs |

### `image.js` — Docker Images

| Command | Description |
|---------|-------------|
| `image list` | List images |
| `image pull <name>` | Pull an image |
| `image remove <name>` | Remove with confirmation |

### `network.js` / `volume.js` — Docker Infrastructure

| Group | Commands |
|-------|---------|
| `network` | `list`, `create <name>`, `remove <name>` |
| `volume` | `list`, `create <name>`, `remove <name>` |

### `registry.js` — Container Registry

| Command | Description |
|---------|-------------|
| `registry list` | List configured registries |
| `registry add` | Interactive: URL, username, password |
| `registry remove <id>` | Remove with confirmation |

### `project.js` — Projects

| Command | Description |
|---------|-------------|
| `project list` | List all projects |
| `project create` | Create a new project |
| `project use <id>` | Set active project |
| `project delete <id>` | Delete with confirmation |

### `secrets.js` — Secrets

| Command | Description |
|---------|-------------|
| `secrets list` | List secrets (values always masked as `****`) |
| `secrets add` | Interactive: name, value, environment |
| `secrets update <id>` | Update value or environment |
| `secrets delete <id>` | Delete with confirmation |

### `tunnel.js` — Public Tunnels

| Command | Description |
|---------|-------------|
| `tunnel list` | List active tunnels |
| `tunnel create` | Create a public tunnel for a service |
| `tunnel delete <id>` | Delete a tunnel |

---

## Developer Experience Details

- Every command that hits the network wraps the call in `withSpinner` — no bare `console.log` during async operations
- `--json` flag on every read command outputs raw JSON for scripting / piping to `jq`
- Destructive commands (`stop`, `remove`, `delete`, `rollback`) always require an `inquirer` confirm prompt
- `--namespace` flag available on all K8s commands to override the persisted namespace without changing config
- Auth errors always surface a specific remediation hint (`devopsease login`, `devopsease doctor`, etc.)

---

## ✅ Outcome

→ Single binary (`devopsease` / `dse`) covers the entire DevOpsEase platform  
→ 25 command modules, 80+ individual sub-commands registered  
→ Shared utility layer keeps all output consistent (tables, spinners, colours)  
→ `~/.devopsease/config.json` persists auth, active cluster, namespace, and project  
→ `devopsease init` detects project type and scaffolds a pipeline in one interactive flow  
→ `devopsease doctor` provides actionable diagnostics with 7 live health checks  
→ `--json` flag on all read commands makes every command scriptable  

## What's Next

📅 **Day 89**

- Polish, testing and write documentation