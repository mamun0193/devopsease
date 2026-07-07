import mongoose from 'mongoose';
import Repository from '../models/repository.model.js';
import Application from '../models/application.model.js';
import PlatformEvent from '../models/platformEvent.model.js';
import Deployment from '../models/deployment.model.js';

class KnowledgeEngine {
    constructor() {
        this.secretPatterns = [
            /bearer\s+[A-Za-z0-9\-\._~\+\/]+=*/ig,
            /(password|secret|key|token|cred)["']?\s*:\s*["']?([^"'\n]+)["']?/ig,
            /([a-zA-Z0-9]{40})/g // Generic hashes
        ];
    }

    /**
     * @param {Object|string} data 
     * @returns {Object|string}
     */
    redactSecrets(data) {
        if (!data) return data;
        let str = typeof data === 'string' ? data : JSON.stringify(data);
        for (const pattern of this.secretPatterns) {
            str = str.replace(pattern, (match, p1) => {
                if (p1) {
                    return match.replace(p1, '***REDACTED***');
                }
                return '***REDACTED***';
            });
        }
        return typeof data === 'string' ? str : JSON.parse(str);
    }

    async getRepositorySummary(repoId) {
        const repo = await Repository.findById(repoId).lean();
        if (!repo) return null;

        const summary = {
            id: repo._id,
            name: repo.name,
            provider: repo.provider,
            branch: repo.defaultBranch,
            buildEngine: repo.blueprint?.buildEngine,
            lastScan: repo.blueprint?.lastScanned,
            status: repo.status
        };

        return this.redactSecrets(summary);
    }

    async getApplicationSummary(appId) {
        const app = await Application.findById(appId).populate('repositoryId').lean();
        if (!app) return null;

        const summary = {
            id: app._id,
            name: app.name,
            status: app.status,
            scalingMode: app.scalingMode,
            instances: app.instances,
            repository: app.repositoryId ? app.repositoryId.name : 'Unknown'
        };

        return this.redactSecrets(summary);
    }

    async getPlatformHealthSummary() {
        // Find recent critical/error events across the platform
        const recentErrors = await PlatformEvent.find({
            severity: { $in: ['ERROR', 'CRITICAL'] },
            timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
        }).sort({ timestamp: -1 }).limit(10).lean();

        const summary = {
            status: recentErrors.length > 0 ? 'DEGRADED' : 'HEALTHY',
            recentCriticalEvents: recentErrors.map(e => ({
                domain: e.domain,
                type: e.eventType,
                summary: e.summary,
                timestamp: e.timestamp
            }))
        };

        return this.redactSecrets(summary);
    }

    async getDeploymentSummary(deploymentId) {
        const deployment = await Deployment.findById(deploymentId).lean();
        if (!deployment) return null;

        const summary = {
            id: deployment._id,
            status: deployment.status,
            stage: deployment.stage,
            startedAt: deployment.startedAt,
            completedAt: deployment.completedAt,
            error: deployment.error
        };

        return this.redactSecrets(summary);
    }

    async resolveContextItems(contextItems) {
        const knowledgeObjects = [];
        for (const item of contextItems) {
            let obj = null;
            switch (item.knowledgeType) {
                case 'Repository':
                    obj = await this.getRepositorySummary(item.resourceId);
                    break;
                case 'Application':
                    obj = await this.getApplicationSummary(item.resourceId);
                    break;
                case 'PlatformHealth':
                    obj = await this.getPlatformHealthSummary();
                    break;
                case 'Deployment':
                    obj = await this.getDeploymentSummary(item.resourceId);
                    break;
            }
            if (obj) {
                knowledgeObjects.push({
                    type: item.knowledgeType,
                    data: obj
                });
            }
        }
        return knowledgeObjects;
    }
}

export default new KnowledgeEngine();
