# Day 97: Build Intelligence Engine (Phase 1)

This sprint focused on building the foundational repository analysis engine for DevOpsEase. The engine automatically scans repositories and fully understands their deployment topology without generating any files, ensuring zero destructive overwrites.

## Key Deliverables

1. **Service-Oriented Orchestrator**
   - The engine maps the repository and breaks it down into independent "Services" (e.g., detecting monorepos or split `client`/`server` folders).
   - This ensures DevOpsEase treats complex repositories not as a single monolith, but as independent deployment targets.

2. **Core Detectors (Per-Service)**
   - **`languageDetector`**: Identifies languages via manifests or file extensions.
   - **`frameworkDetector`**: Pinpoints frameworks (React, Next.js, Express, Spring Boot, etc.).
   - **`packageManagerDetector`**: Locks onto specific package managers (`yarn`, `pnpm`, `npm`, `poetry`, etc.).
   - **`infrastructureDetector`**: Scans for existing `Dockerfile`s or `docker-compose.yml` configs so future features won't overwrite them.
   - **`buildContextDetector`**: Computes build context paths, entry points, and output directories (`dist`, `.next`).
   - **`runtimeDetector` & `portDetector`**: Predicts standard runtime commands (`npm run build`, `npm start`) and listening ports.

3. **Confidence Scoring Engine**
   - All detectors yield a confidence probability rating (e.g., `0.99`), natively resolving overlaps and allowing logical decision making downstream.

4. **Topology Dependency Graph**
   - The system detects databases and external message brokers (Redis, PostgreSQL, Mongoose, etc.).
   - It builds an edge-based Dependency Graph mapping frontends to backends, and backends to their respective databases.

5. **Analysis Caching & API Integration**
   - The engine securely caches its analysis based on the workspace's Git `commitHash`, guaranteeing sub-second response times on unchanged repositories.
   - A placeholder AI Hook (`postProcessAnalysis`) was added for future LLM integration.
   - Integrated into the backend at `GET /api/system/intelligence/:repoId`.

This Phase 1 architecture serves as the robust single-source-of-truth object that will power upcoming Dockerfile, Kubernetes, and CI/CD generation systems.
