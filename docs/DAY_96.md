# Day 96: Pipeline & Deployment State Reconciliation Updates

This document summarizes the changes that have been implemented locally but are not yet pushed to the remote repository. 

## Overview
The primary focus of these changes is resolving **state divergence** between the MongoDB database records and actual Docker resources (Images, Containers) throughout the pipeline lifecycle. We also added full real-time WebSocket streaming for pipeline logs on the frontend.

### Frontend Updates (Dashboard)
- **Pipeline WebSocket Integration:** Modified `PipelineRunDetailPage.tsx`, `PipelinesPage.tsx`, and `PipelineDetailPage.tsx` to consume real-time pipeline status updates and logs via WebSockets.
- **Deployment Controls:** Modified `DeploymentsPage.tsx` to handle Stop and Remove deployment actions more cleanly.
- **API & Hooks:** Minor adjustments in `useBuilds.ts` and `api/index.ts` to support the updated endpoints.

### Backend Updates (Server)
#### 1. Deployment & Resource Lifecycle (`deployment.service.js`)
- Integrated `ownershipService`, `resourceService`, and `quotaService` directly into the deployment lifecycle.
- **Scaling Up (`reconcileDeployment`)**: Newly spun up containers are now correctly registered to `ContainerOwnership`, added to the centralized Resource registry, and counted against user quotas.
- **Scaling Down & Rollbacks**: Fully implemented ownership release, resource status updates (to `deleted`), and quota decrements for removed/failed containers.

#### 2. Build Pipeline Lifecycle (`build.service.js`)
- Added post-build image inspection (`docker.getImage(imageTag).inspect()`).
- Successfully built images are now properly recorded in the `Image` collection.
- Automatically increments the user's `storageUsedMB` quota.
- Registers the build and the resulting image directly into the `Resource` registry for dashboard synchronization.

#### 3. Pipeline Core Architecture (`pipeline.service.js`)
- Refactored background pipeline execution (`_runPipelineStepsInBackground`) to ensure state resilience.
- Added Time-of-Check to Time-of-Use (TOCTOU) guards to prevent duplicate pipeline executions.
- Embedded `pipelineBroadcaster.broadcastStatus` calls throughout the pipeline steps (build, test, deploy) to stream live status and log updates to connected frontend clients.
- Added catastrophic failure recovery blocks to ensure stranded background jobs fail gracefully in the database.

#### 4. WebSockets (`ws.js` & `pipelineBroadcaster.js`)
- **New File:** Created `pipelineBroadcaster.js` to manage pipeline subscription channels.
- **Routing:** Updated `ws.js` to route and authenticate incoming `/ws/pipeline/:runId` connections using JWT.
- Pipeline logs and stage transitions are now actively streamed to the frontend dashboard.

#### 5. Git Synchronization (`git.service.js`)
- Enhanced Git tracking to pull the latest repository changes and commit metadata prior to pipeline execution.
