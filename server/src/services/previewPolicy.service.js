import PreviewPolicy from '../models/previewPolicy.model.js';
import User from '../models/User.js';
import { PLANS, DEFAULT_PLAN } from '../config/plans.js';

class PreviewPolicyService {
    /**
     * Get preview policy for a repository.
     * If no policy exists, returns plan-derived defaults.
     */
    async getPolicy(repositoryId, userId) {
        let policy = await PreviewPolicy.findOne({ repositoryId });
        if (policy) return policy;

        // Return plan-derived defaults
        const user = await User.findById(userId);
        const planKey = user?.subscription?.plan || DEFAULT_PLAN;
        const plan = PLANS[planKey] || PLANS[DEFAULT_PLAN];

        return {
            repositoryId,
            autoCreateOnPush: false,
            autoDestroyOnMerge: true,
            allowedBranches: [],
            ttlMinutes: 240,
            maxLifetimeMinutes: 1440,
            maxExtensions: 3,
            idleTimeoutMinutes: 60,
            maxPreviews: plan.maxPreviews || 3,
            cpuLimit: plan.previewCpu || '0.5',
            memoryLimit: plan.previewMemory || '256m',
            visibility: 'private',
            isDefault: true // Indicates it's not saved yet
        };
    }

    /**
     * Upsert preview policy for a repository.
     */
    async upsertPolicy(repositoryId, userId, updateData) {
        // Ensure limits do not exceed plan limits
        const user = await User.findById(userId);
        const planKey = user?.subscription?.plan || DEFAULT_PLAN;
        const plan = PLANS[planKey] || PLANS[DEFAULT_PLAN];

        // Sanitize incoming data against plan maximums
        const sanitizedData = {
            ...updateData,
            maxPreviews: Math.min(updateData.maxPreviews || 1, plan.maxPreviews || 3)
        };

        const policy = await PreviewPolicy.findOneAndUpdate(
            { repositoryId },
            {
                ...sanitizedData,
                userId
            },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        return policy;
    }
}

export default new PreviewPolicyService();
