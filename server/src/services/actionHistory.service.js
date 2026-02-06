import crypto from "crypto";
import {
  isRedisConnected,
  safeLpush,
  safeLtrim,
  safeLrange,
  safeDel,
} from "../redis/client.js";
import logger from "../utils/logger.js";

const REDIS_KEY = "devopsease:actions:history";
const MAX_SIZE = 1000;

// Action history service with Redis persistence, in-memory fallback, and graceful error handling
class ActionHistoryService {
  constructor() {
    // In-memory storage (always active as fallback)
    this.memoryActions = [];
  }

  // Record a container action - Stores in Redis if available, else memory (never throws)
  async recordAction({
    containerId,
    containerName,
    action,
    status,
    reason,
    source = "user",
  }) {
    const actionRecord = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      container: {
        id: containerId,
        name: containerName || null,
      },
      action,
      status,
      reason: reason || null,
      source,
    };

    // Always store in memory (as backup)
    this.addToMemory(actionRecord);

    // Also store in Redis if available (fire-and-forget)
    if (isRedisConnected()) {
      this.persistToRedis(actionRecord);
    }

    const storage = isRedisConnected() ? "redis+memory" : "memory-only";

    console.log("🎬 Action recorded:", {
      actionId: actionRecord.id,
      containerId,
      containerName,
      action,
      status,
      storage,
    });

    logger.info("Action recorded", {
      event: "container_action",
      actionId: actionRecord.id,
      containerId,
      action,
      status,
      storage,
    });

    return actionRecord;
  }

  // Add action to in-memory storage (bounded)
  addToMemory(actionRecord) {
    this.memoryActions.unshift(actionRecord);
    if (this.memoryActions.length > MAX_SIZE) {
      this.memoryActions = this.memoryActions.slice(0, MAX_SIZE);
    }
  }

  // Persist action to Redis (non-blocking, fire-and-forget)
  persistToRedis(actionRecord) {
    try {
      const serialized = JSON.stringify(actionRecord);
      safeLpush(REDIS_KEY, serialized);
      safeLtrim(REDIS_KEY, 0, MAX_SIZE - 1);
    } catch (error) {
      // Serialization error - just log and continue
      logger.warn("Failed to serialize action for Redis", {
        actionId: actionRecord.id,
        error: error.message,
      });
    }
  }

  // Get actions with optional filtering - Tries Redis first, falls back to memory
  async getActions({ containerId, limit = 50, cursor } = {}) {
    let actions = [];

    // Try Redis first
    if (isRedisConnected()) {
      actions = await this.getFromRedis();
    }

    // Fall back to memory if Redis returned nothing
    if (actions.length === 0) {
      actions = this.memoryActions;
    }

    const storage = isRedisConnected() && actions !== this.memoryActions
      ? "redis"
      : "memory";

    console.log("🔍 getActions called:", {
      containerId,
      limit,
      cursor,
      totalActions: actions.length,
      storage,
    });

    // Filter by container ID if provided
    if (containerId) {
      actions = actions.filter((action) => {
        const actionId = action.container.id;
        const queryId = containerId;
        return (
          queryId.startsWith(actionId) ||
          actionId.startsWith(queryId) ||
          actionId === queryId
        );
      });
    }

    // Apply cursor pagination
    let startIndex = 0;
    if (cursor) {
      const cursorIndex = actions.findIndex((action) => action.id === cursor);
      if (cursorIndex !== -1) {
        startIndex = cursorIndex + 1;
      }
    }

    const items = actions.slice(startIndex, startIndex + limit);

    const nextCursor =
      items.length === limit && startIndex + limit < actions.length
        ? items[items.length - 1].id
        : null;

    return {
      items,
      nextCursor,
    };
  }

  // Get actions from Redis - Returns empty array on error
  async getFromRedis() {
    try {
      const rawActions = await safeLrange(REDIS_KEY, 0, -1);
      if (!rawActions || rawActions.length === 0) {
        return [];
      }

      // Parse each action, skipping any that fail
      const actions = [];
      for (const raw of rawActions) {
        try {
          actions.push(JSON.parse(raw));
        } catch (parseError) {
          // Skip malformed entries
          logger.warn("Skipping malformed action record", {
            error: parseError.message,
          });
        }
      }
      return actions;
    } catch (error) {
      logger.warn("Failed to get actions from Redis, using memory", {
        error: error.message,
      });
      return [];
    }
  }

  // Get action by ID
  async getActionById(actionId) {
    const { items } = await this.getActions({ limit: MAX_SIZE });
    return items.find((action) => action.id === actionId) || null;
  }

  // Clear all action history
  async clear() {
    // Clear memory
    this.memoryActions = [];

    // Clear Redis (fire-and-forget)
    if (isRedisConnected()) {
      safeDel(REDIS_KEY);
    }

    logger.info("Action history cleared");
  }

  // Get action statistics
  async getStats() {
    const { items } = await this.getActions({ limit: MAX_SIZE });

    const total = items.length;
    const successCount = items.filter((a) => a.status === "success").length;
    const failedCount = items.filter((a) => a.status === "failed").length;

    return {
      total,
      success: successCount,
      failed: failedCount,
      storage: isRedisConnected() ? "redis" : "memory",
    };
  }

  // Get in-memory actions (for debugging)
  get actions() {
    return this.memoryActions;
  }

  // Get storage status
  getStatus() {
    return {
      redisAvailable: isRedisConnected(),
      memoryCount: this.memoryActions.length,
    };
  }
}

const actionHistoryService = new ActionHistoryService();

export default actionHistoryService;
