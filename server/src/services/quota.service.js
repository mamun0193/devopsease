import Quota from "../models/quota.model.js";
import { PLANS, DEFAULT_PLAN } from "../config/plans.js";
import AppError from "../utils/AppError.js";
import logger from "../utils/logger.js";

class QuotaService {

  async getOrCreateQuota(userId, plan) {
    if (!userId) throw new AppError("userId is required", 400);

    let quota = await Quota.findOne({ userId });
    if (quota) return quota;

    // First interaction — create quota from plan defaults
    const planConfig = PLANS[plan] || PLANS[DEFAULT_PLAN];

    quota = await Quota.create({
      userId,
      maxContainers: planConfig.maxContainers,
      maxCPU: planConfig.maxCPU,
      maxMemoryMB: planConfig.maxMemoryMB,
      usedContainers: 0,
      usedCPU: 0,
      usedMemoryMB: 0,
    });

    logger.info("Quota record created for user", { userId, plan: plan || DEFAULT_PLAN });
    return quota;
  }

  // Retrieve the quota record for a user. Throws if not found.
  async getUserQuota(userId) {
    const quota = await Quota.findOne({ userId });
    if (!quota) {
      throw new AppError("Quota record not found for this user", 404);
    }
    return quota;
  }

  // Check only the container count limit (CPU/memory tracked by resource monitor).
  async checkContainerCount(userId) {
    const quota = await this.getUserQuota(userId);

    if (quota.usedContainers + 1 > quota.maxContainers) {
      throw new AppError(
        `Container limit exceeded. Used ${quota.usedContainers}/${quota.maxContainers} containers. Remove an existing container or upgrade your plan.`,
        403,
        "QUOTA_CONTAINERS_EXCEEDED"
      );
    }

    return quota;
  }

  // Increment container count after successful container creation.
  async incrementContainerCount(userId) {
    const quota = await Quota.findOneAndUpdate(
      { userId },
      { $inc: { usedContainers: 1 } },
      { new: true }
    );

    if (!quota) {
      logger.error("Failed to increment container count — record not found", { userId });
      throw new AppError("Quota record not found", 404);
    }

    logger.info("Container count incremented", {
      userId,
      usedContainers: quota.usedContainers,
    });

    return quota;
  }

  // Decrement container count after container removal.
  async decrementContainerCount(userId) {
    const quota = await Quota.findOne({ userId });
    if (!quota) {
      logger.warn("Cannot decrement container count — record not found", { userId });
      return null;
    }

    quota.usedContainers = Math.max(0, quota.usedContainers - 1);
    await quota.save();

    logger.info("Container count decremented", {
      userId,
      usedContainers: quota.usedContainers,
    });

    return quota;
  }

  // Set actual usage from Docker stats (called by resource monitor).
  async updateRealUsage(userId, cpuCores, memoryMB, containerCount) {
    const updateFields = {
      usedCPU: parseFloat(cpuCores.toFixed(4)),
      usedMemoryMB: Math.round(memoryMB),
    };

    // Reconcile container count if provided
    if (containerCount !== undefined) {
      updateFields.usedContainers = containerCount;
    }

    const quota = await Quota.findOneAndUpdate(
      { userId },
      { $set: updateFields },
      { new: true }
    );

    if (!quota) {
      logger.warn("Cannot update real usage — quota record not found", { userId });
      return null;
    }

    return quota;
  }

  // Format quota data for API response with computed remaining fields.
  formatQuotaResponse(quota) {
    return {
      maxContainers: quota.maxContainers,
      maxCPU: quota.maxCPU,
      maxMemoryMB: quota.maxMemoryMB,
      usedContainers: quota.usedContainers,
      usedCPU: quota.usedCPU,
      usedMemoryMB: quota.usedMemoryMB,
      remainingContainers: quota.maxContainers - quota.usedContainers,
      remainingCPU: parseFloat((quota.maxCPU - quota.usedCPU).toFixed(2)),
      remainingMemoryMB: quota.maxMemoryMB - quota.usedMemoryMB,
    };
  }
}

export default new QuotaService();
