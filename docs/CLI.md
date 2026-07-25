# DevOpsEase CLI (v1.0)

The DevOpsEase CLI provides a unified terminal interface for managing deployments, Kubernetes clusters, CI/CD pipelines, observability, and platform configuration.

## Installation

```bash
npm install -g devopsease-cli
# Or run without installing:
npx devopsease-cli doctor
```

## Global Options

All commands support the following global options:
- `--json`: Output raw JSON instead of human-readable text. Useful for CI/CD scripting and piping to `jq`.
- `--help`: View detailed help for a specific command or command group.

## Core Concepts

- **Interactive Fallbacks:** Whenever a command requires an `[id]` but it is omitted, the CLI will interactively prompt you with a searchable list of available resources.
- **Destructive Confirmations:** Deleting or destroying resources will prompt for confirmation. Use `-f` or `--force` to bypass in automation scripts.

## Command Reference

### Authentication (`devopsease auth`)
Manage authentication and personal access tokens (PATs).
- `login` — Authenticate via email/password.
- `logout` — Clear stored credentials.
- `whoami` — Show the current user profile.
- `token set <token>` — Authenticate using a PAT.
- `token clear` — Remove the stored PAT.
- `token validate` — Check if the current token is active.
- `token create` — Generate a new PAT (requires an active session).

### Applications (`devopsease app`)
Manage applications and their deployments.
- `list` — List all applications.
- `create` — Create a new application and link it to a repository.
- `get [id]` — View details for an application.
- `delete [id]` — Delete an application.

### Previews (`devopsease preview`)
Manage ephemeral preview environments for pull requests or branches.
- `list` — List active preview environments.
- `create` — Provision a new preview environment.
- `get [id]` — View preview details.
- `extend [id]` — Reset the TTL to prevent expiry.
- `destroy [id]` — Tear down a preview environment.

### Domains (`devopsease domain`)
Manage custom domains and SSL routing.
- `list` — List all custom domains.
- `add` — Add a custom domain and optionally link it to an app.
- `get [id]` — View domain details and status.
- `remove [id]` — Remove a custom domain.
- `verify [id]` — Trigger DNS verification checks.

### Environment & Config (`devopsease env`)
Manage application and global configuration secrets and variables.
- `list` — List all configuration entries.
- `set` — Interactively set a new configuration key/value pair.
- `delete [id]` — Remove a configuration entry.
- `versions [id]` — View version history of an entry.
- `rollback [id]` — Revert an entry to its previous version.

### Traffic & Routing (`devopsease traffic`)
Manage advanced routing, canary deployments, and A/B testing.
- `policies` — List active traffic routing policies.
- `apply` — Interactively create or update a traffic policy.
- `routes <slug>` — View the exact routing table for an application.

### Releases (`devopsease release`)
Manage deployment history and environment promotion.
- `list` — List all releases.
- `get [id]` — View release details.
- `promote [id]` — Promote a release to the next environment (e.g., Staging -> Prod).
- `rollback [id]` — Roll back an environment to a previous release.

### Observability (`devopsease observe`)
Monitor platform health and events.
- `health` — View high-level platform component health (Docker, DB, etc.).
- `events` — View recent system events and audit logs.
- `metrics` — View aggregate platform usage metrics.

### Deployments (`devopsease deploy`)
Manage individual deployment instances.
- `list` — List active deployments.
- `get [id]` — View deployment details.
- `logs [id]` — Tail deployment logs.
- `scale [id] -r <count>` — Scale the replicas of a deployment.

### Containers (`devopsease container`)
Directly manage Docker containers on the platform.
- `list` — List running containers.
- `health [id]` — Check container health probes.
- `top [id]` — View running processes inside a container.
- `pause [id]` / `unpause [id]` — Suspend or resume a container.
- `restart [id]` — Restart a container.
- `logs [id]` — View raw container logs.

## Scripting Example (CI/CD)

```bash
# Authenticate using a previously generated PAT
export DSE_TOKEN="dse_xyz123..."
devopsease auth token set $DSE_TOKEN

# Create a preview environment and extract the ID using jq
PREVIEW_ID=$(devopsease preview create --branch feature/login --json | jq -r '.id')

# Verify the health of the platform before deploying
HEALTH=$(devopsease observe health --json | jq -r '.status')
if [ "$HEALTH" != "healthy" ]; then
  echo "Platform is not healthy. Aborting."
  exit 1
fi
```
