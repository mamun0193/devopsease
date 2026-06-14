# DAY 93: Complete Pipeline Dashboard UI & Engine Hardening

## Overview
Today's session achieved two major milestones:
1. Built the complete Frontend Dashboard for Pipeline Management, allowing users to create, run, monitor, and view logs for CI/CD pipelines natively in the React app.
2. Hardened the backend pipeline engine to support asynchronous execution and fortified repository connection logic against invalid URLs.

## 1. Frontend Pipeline Management UI

### New Pipeline Pages & Routing
Added three new protected routes in `App.tsx`:
- `/pipelines` -> `PipelinesPage`: Lists all pipelines, searchable and filterable by repository. Displays pipeline status, latest run, and provides an action menu to view, run, or delete.
- `/pipelines/:id` -> `PipelineDetailPage`: Shows detailed pipeline configuration, execution metrics (Run count, Success Rate, Avg Duration, Last Success), and a real-time activity feed of recent runs with commit metadata.
- `/pipeline-runs/:id` -> `PipelineRunDetailPage`: Provides a granular timeline view of a specific execution run. Includes live log streaming via WebSockets and direct artifact links (Docker builds, Deployments).

### Components & Hooks
- **CreatePipelineModal**: A streamlined wizard for pipeline creation. Users select a repository, branch, name, and toggle steps (Build, Test, Deploy) without needing to write YAML manually.
- **usePipelines Hook**: Encapsulates 8 React Query hooks for fetching pipelines, runs, metrics, and managing mutations (create, run, delete).
- **usePipelineSocket Hook**: Manages real-time WebSocket connections to stream logs and execution events. Includes a 3-retry fallback mechanism that switches to API polling and displays an amber "Live updates unavailable" banner if the connection fails.
- **ResourceNav**: Added the "Pipelines" tab navigation (with GitMerge icon) between Repositories and Builds.
- **Types**: Added robust `Pipeline`, `PipelineRun`, and `CIPipelineMetrics` TypeScript interfaces to `api/index.ts`.

## 2. Pipeline Execution Engine Fixes

- **Asynchronous Execution (Timeout Fix)**: The backend API `POST /api/pipelines/:id/run` was blocking the HTTP response until the entire pipeline (clone, build, test, deploy) finished. This caused frontend requests to time out and display a false "Failed to run pipeline" error. Refactored `executePipeline` into an asynchronous background task (`_runPipelineStepsInBackground`) so the server returns the `PipelineRun` ID immediately. This allows the UI to navigate instantly to the run detail page and poll for status.
- **Double-Deploy Bug Fixed**: Resolved an issue where pipelines were triggering deployments twice. Modified `runBuildPipeline` in `build.service.js` to accept a `skipAutoDeploy` flag so the pipeline engine (which manages its own explicit `deploy` step) bypasses the default automatic deployment.
- **Test Step Execution Hardening**: The test runner (`pipeline.service.js`) now properly executes real test commands (`npm test` or `pytest`) dynamically based on project type. It includes built-in safeguards such as a 5-minute execution timeout and a 10MB output size limit to prevent memory exhaustion and runaway processes.
- **Filesystem Log Streaming**: Migrated pipeline and build logging to the filesystem to prevent database bloat. The frontend (`PipelineRunDetailPage.tsx`) implements an HTTP streaming reader (`fetch` API) to efficiently pull large log files, seamlessly merging them with real-time WebSocket updates (`usePipelineSocket.ts`).

## 3. Repository Connection Hardening

- **Multi-Layer Validation**: Implemented strict validation for new repository connections:
  1. Frontend Regex validation in `ConnectRepoModal.tsx` to catch invalid Git URLs instantly.
  2. Backend Regex validation in `repository.controller.js`.
  3. Real reachability check using `git ls-remote` before saving the repository to ensure only accessible, valid Git URLs are added to the system.
- **Status Syncing**: Aligned frontend repository status values with the backend database (`active`, `disconnected`, `error`) across `HomePage`, `RepositoriesPage`, and `RepoListTable`, replacing the old mismatched uppercase statuses.
- **Null Safety**: Added null checks in the pipelines frontend pages to prevent crashes when viewing pipelines attached to repositories that have been subsequently deleted.
