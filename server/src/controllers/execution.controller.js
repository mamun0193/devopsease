import DeploymentExecution from '../models/deploymentExecution.model.js';
import ArtifactRevision from '../models/artifactRevision.model.js';
import { DockerExecutor } from '../deployments/executors/docker/docker.executor.js';
import { initLogFile, appendLogLine, readLogFile } from '../services/executionLog.service.js';
import { broadcastExecutionEvent } from '../websocket/executionStreamer.js';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';
import { getRegistryConfig } from '../config/registry.config.js';

export const executeDeployment = async (req, res) => {
    try {
        const { artifactRevisionId } = req.params;
        const revision = await ArtifactRevision.findById(artifactRevisionId).populate('artifactBundleId');
        
        if (!revision) {
            return res.status(404).json({ success: false, error: 'Artifact revision not found' });
        }
        
        if (revision.approvalStatus !== 'APPROVED') {
            return res.status(400).json({ success: false, error: 'Cannot execute unapproved revision' });
        }

        const executionId = uuidv4();
        const registryConfig = await getRegistryConfig(revision.artifactBundleId.repoId);
        const provider = registryConfig.provider || 'docker';

        // Init logs
        const logPointer = await initLogFile(executionId);

        const execution = await DeploymentExecution.create({
            deploymentId: executionId,
            artifactBundleId: revision.artifactBundleId._id,
            artifactRevisionId: revision._id,
            provider,
            executor: 'docker',
            status: 'PENDING',
            logPath: logPointer.key
        });

        res.status(202).json({ success: true, data: execution, message: 'Deployment started' });

        // Run execution asynchronously
        runExecutionPipeline(execution, revision, logPointer).catch(err => {
            logger.error(`Execution pipeline failed for ${executionId}: ${err.message}`);
        });

    } catch (error) {
        logger.error('Failed to start deployment:', error);
        res.status(500).json({ success: false, error: 'Failed to start deployment' });
    }
};

async function runExecutionPipeline(execution, revision, logPointer) {
    const loggerStream = (message) => {
        const logLine = `[${new Date().toISOString()}] ${message}\n`;
        appendLogLine(logPointer.key, logLine);
        broadcastExecutionEvent(execution.deploymentId, 'log', { message: logLine });
    };

    let executor;
    try {
        if (execution.provider === 'docker' || execution.provider === 'local') {
            executor = new DockerExecutor(execution.deploymentId, revision, loggerStream, revision.artifactBundleId.repoId);
        } else {
            throw new Error(`Unsupported provider: ${execution.provider}`);
        }

        execution.status = 'VALIDATING';
        await execution.save();
        broadcastExecutionEvent(execution.deploymentId, 'validation-started');
        await executor.validate();
        broadcastExecutionEvent(execution.deploymentId, 'validation-success');

        execution.status = 'PREPARING';
        await execution.save();
        await executor.prepare();

        execution.status = 'EXECUTING';
        await execution.save();
        broadcastExecutionEvent(execution.deploymentId, 'deployment-started');
        await executor.deploy();

        execution.status = 'HEALTH_CHECKING';
        await execution.save();
        broadcastExecutionEvent(execution.deploymentId, 'health-check');
        await executor.healthCheck();

        execution.status = 'SUCCESS';
        execution.completedAt = new Date();
        execution.duration = execution.completedAt - execution.startedAt;
        await execution.save();
        broadcastExecutionEvent(execution.deploymentId, 'deployment-complete');

    } catch (error) {
        loggerStream(`ERROR: ${error.message}`);
        execution.status = 'FAILED';
        execution.completedAt = new Date();
        execution.duration = execution.completedAt - execution.startedAt;
        await execution.save();
        broadcastExecutionEvent(execution.deploymentId, 'deployment-failed', { error: error.message });
        
        // Auto-cleanup on failure
        if (executor) {
            loggerStream("Starting failure recovery / cleanup...");
            try {
                await executor.destroy();
                loggerStream("Failure recovery completed.");
            } catch (cleanupErr) {
                loggerStream(`Failed to cleanup after failure: ${cleanupErr.message}`);
            }
        }
    }
}

export const getExecution = async (req, res) => {
    try {
        const { id } = req.params;
        const execution = await DeploymentExecution.findOne({ deploymentId: id })
            .populate('artifactRevisionId')
            .populate('artifactBundleId');
            
        if (!execution) return res.status(404).json({ success: false, error: 'Execution not found' });
        
        res.status(200).json({ success: true, data: execution });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch execution' });
    }
};

export const getExecutionLogs = async (req, res) => {
    try {
        const { id } = req.params;
        const execution = await DeploymentExecution.findOne({ deploymentId: id });
        
        if (!execution || !execution.logPath) {
            return res.status(404).json({ success: false, error: 'Logs not found' });
        }
        
        const logs = await readLogFile(execution.logPath);
        res.status(200).json({ success: true, data: { logs } });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch logs' });
    }
};

export const rollbackExecution = async (req, res) => {
    try {
        const { id } = req.params;
        const execution = await DeploymentExecution.findOne({ deploymentId: id }).populate('artifactRevisionId');
        
        if (!execution) return res.status(404).json({ success: false, error: 'Execution not found' });
        
        // Retrieve repoId from the artifact bundle it used
        const bundleId = execution.artifactBundleId;
        const bundle = await ArtifactBundle.findById(bundleId);
        
        // We do a simple docker executor initialization just for rollback
        const loggerStream = (message) => {
            const logLine = `[${new Date().toISOString()}] [ROLLBACK] ${message}\n`;
            appendLogLine(execution.logPath, logLine);
            broadcastExecutionEvent(execution.deploymentId, 'log', { message: logLine });
        };
        
        const executor = new DockerExecutor(execution.deploymentId, execution.artifactRevisionId, loggerStream, bundle.repoId);
        
        execution.status = 'ROLLING_BACK';
        await execution.save();
        broadcastExecutionEvent(execution.deploymentId, 'rollback-started');
        
        await executor.rollback();
        
        execution.status = 'ROLLED_BACK';
        await execution.save();
        broadcastExecutionEvent(execution.deploymentId, 'rollback-complete');
        
        res.status(200).json({ success: true, data: execution });
    } catch (error) {
        logger.error('Rollback failed:', error);
        res.status(500).json({ success: false, error: 'Rollback failed' });
    }
};
