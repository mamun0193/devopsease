export class DeploymentExecutor {
    constructor(executionId, artifactRevision, loggerStream) {
        if (new.target === DeploymentExecutor) {
            throw new TypeError("Cannot construct DeploymentExecutor instances directly");
        }
        this.executionId = executionId;
        this.artifactRevision = artifactRevision;
        this.loggerStream = loggerStream; // A function or stream to append logs to the StorageService
    }

    log(message) {
        if (this.loggerStream) {
            this.loggerStream(message);
        } else {
            console.log(`[${this.executionId}] ${message}`);
        }
    }

    async validate() {
        throw new Error("Method 'validate()' must be implemented.");
    }

    async prepare() {
        throw new Error("Method 'prepare()' must be implemented.");
    }

    async deploy() {
        throw new Error("Method 'deploy()' must be implemented.");
    }

    async healthCheck() {
        throw new Error("Method 'healthCheck()' must be implemented.");
    }

    async rollback() {
        throw new Error("Method 'rollback()' must be implemented.");
    }

    async destroy() {
        throw new Error("Method 'destroy()' must be implemented.");
    }
}
