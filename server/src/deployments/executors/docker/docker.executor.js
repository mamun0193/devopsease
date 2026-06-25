import { DeploymentExecutor } from '../deploymentExecutor.interface.js';
import { exec } from 'child_process';
import util from 'util';
import path from 'path';
import fs from 'fs';
import { getWorkspacePath } from '../../../utils/workspace.js';

const execAsync = util.promisify(exec);

export class DockerExecutor extends DeploymentExecutor {
    constructor(executionId, artifactRevision, loggerStream, repoId) {
        super(executionId, artifactRevision, loggerStream);
        this.repoId = repoId;
        this.workspaceDir = getWorkspacePath(this.repoId);
        this.networkName = `devopsease_net_${this.repoId}`;
    }

    async validate() {
        this.log("Validating Docker environment...");
        try {
            await execAsync('docker info');
            this.log("Docker is running and accessible.");
            return true;
        } catch (error) {
            this.log(`Docker validation failed: ${error.message}`);
            throw new Error("Docker daemon is not accessible.");
        }
    }

    async prepare() {
        this.log("Preparing Docker deployment...");
        
        // Write the compose file to the workspace
        const composeContent = this.artifactRevision.editedArtifacts?.compose?.content || 
                               this.artifactRevision.artifactBundleId.compose.content;
                               
        if (!composeContent) {
            throw new Error("No docker-compose.yml found in artifacts");
        }

        const composePath = path.join(this.workspaceDir, 'docker-compose.deploy.yml');
        await fs.promises.mkdir(this.workspaceDir, { recursive: true });
        await fs.promises.writeFile(composePath, composeContent);
        
        this.composePath = composePath;
        this.log("Docker compose file written.");
    }

    async deploy() {
        this.log("Executing Docker deployment...");
        try {
            // Using docker compose up -d
            const cmd = `docker compose -f ${this.composePath} up -d --build`;
            this.log(`Running: ${cmd}`);
            
            const { stdout, stderr } = await execAsync(cmd, { cwd: this.workspaceDir });
            if (stdout) this.log(stdout);
            if (stderr) this.log(stderr); // stderr often contains progress in docker-compose
            
            this.log("Deployment completed successfully.");
        } catch (error) {
            this.log(`Deployment failed: ${error.message}`);
            throw error;
        }
    }

    async healthCheck() {
        this.log("Running health checks...");
        // In a real scenario, we'd check if containers are running, their health status, etc.
        try {
            const cmd = `docker compose -f ${this.composePath} ps --format json`;
            const { stdout } = await execAsync(cmd, { cwd: this.workspaceDir });
            this.log(`Container status:\n${stdout}`);
            return true;
        } catch (error) {
            this.log(`Health check failed: ${error.message}`);
            throw error;
        }
    }

    async rollback() {
        this.log("Initiating rollback...");
        try {
            const cmd = `docker compose -f ${this.composePath} down`;
            this.log(`Running: ${cmd}`);
            const { stdout, stderr } = await execAsync(cmd, { cwd: this.workspaceDir });
            if (stdout) this.log(stdout);
            if (stderr) this.log(stderr);
            this.log("Rollback completed.");
        } catch (error) {
            this.log(`Rollback failed: ${error.message}`);
            throw error;
        }
    }

    async destroy() {
        this.log("Cleaning up resources...");
        try {
            const cmd = `docker compose -f ${this.composePath} down -v`;
            const { stdout, stderr } = await execAsync(cmd, { cwd: this.workspaceDir });
            if (stdout) this.log(stdout);
            if (stderr) this.log(stderr);
            this.log("Cleanup completed.");
        } catch (error) {
            this.log(`Cleanup failed: ${error.message}`);
            throw error;
        }
    }
}
