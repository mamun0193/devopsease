# DevOpsEase – Day 1

## Goal of Day 1
Understand Docker beyond CLI and build a backend that can observe and control containers programmatically.

---

## What I Built
- Node.js backend for DevOpsEase
- API to list Docker containers (`docker ps` equivalent)
- API to fetch container logs (`docker logs` equivalent)
- Clean backend folder structure separating routes and Docker logic

---

## Key Docker Concepts Learned

### 1. Docker CLI vs Docker Engine
- Docker CLI is just a client
- Real control happens via Docker Engine API
- DevOps tools communicate directly with the Engine, not the CLI

### 2. Host vs Container Isolation
- Docker CLI exists on the host, not inside containers
- Containers cannot control other containers by default
- This isolation is a core security feature

### 3. Docker Engine API
Important endpoints:
- List containers
- Inspect containers
- Fetch logs
- Stop / restart containers

Learned how real DevOps tools replace CLI commands using APIs.

### 4. Logs in Docker
- Logs come from stdout and stderr
- `docker logs` is just a viewer
- Logs can be fetched programmatically
- Log streaming enables dashboards and monitoring tools

### 5. Container Lifecycle
States:
- created
- running
- exited
- dead

These states are used by dashboards to show container health.

---

## Commands Practiced Today
- docker ps / docker ps -a
- docker logs / docker logs -f
- docker inspect
- docker stats
- docker exec -it <container> bash

---

## Problems Faced & Fixed
- Docker daemon not running on Windows
- Understood Docker Desktop + WSL2 dependency
- Understood why `docker` command is not available inside containers

---

## Key Takeaways
- DevOps is about controlling systems, not memorizing commands
- Docker CLI is replaceable; APIs are fundamental
- DevOpsEase will act as a Docker controller and observer

---

## Next Steps (Day 2 Plan)
- Restart containers via API
- Read container health status
- Fetch CPU and memory usage
- Add Nginx reverse proxy
