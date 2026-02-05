import crypto from "crypto";
import logger from "../utils/logger.js";

class ActionHistoryService {
  constructor() {
    this.actions = [];
    this.maxSize = 1000;
  }

  recordAction({ containerId, containerName, action, status, reason, source = "user" }) {
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

    this.actions.unshift(actionRecord);

    if (this.actions.length > this.maxSize) {
      this.actions = this.actions.slice(0, this.maxSize);
    }

    console.log('🎬 Action recorded:', {
      actionId: actionRecord.id,
      containerId,
      containerName,
      action,
      status,
      totalActions: this.actions.length
    });

    logger.info("Action recorded", {
      event: "container_action",
      actionId: actionRecord.id,
      containerId,
      action,
      status,
    });

    return actionRecord;
  }

  getActions({ containerId, limit = 50, cursor } = {}) {
    let filteredActions = this.actions;

    console.log('🔍 getActions called:', { 
      containerId, 
      limit, 
      cursor,
      totalActions: this.actions.length,
      actionIds: this.actions.slice(0, 3).map(a => ({ id: a.container.id, name: a.container.name, action: a.action }))
    });

    if (containerId) {
      filteredActions = this.actions.filter((action) => {
        const actionId = action.container.id;
        const queryId = containerId;
        
        const matches = queryId.startsWith(actionId) || actionId.startsWith(queryId) || actionId === queryId;
        
        if (this.actions.indexOf(action) < 3) {
          console.log('🔍 Filtering:', { actionId, queryId, matches });
        }
        
        return matches;
      });
      
      console.log('🔍 After filtering:', { filteredCount: filteredActions.length });
    }

    let startIndex = 0;
    if (cursor) {
      const cursorIndex = filteredActions.findIndex((action) => action.id === cursor);
      if (cursorIndex !== -1) {
        startIndex = cursorIndex + 1;
      }
    }

    const items = filteredActions.slice(startIndex, startIndex + limit);
    
    const nextCursor = items.length === limit && startIndex + limit < filteredActions.length
      ? items[items.length - 1].id
      : null;

    return {
      items,
      nextCursor,
    };
  }

  getActionById(actionId) {
    return this.actions.find((action) => action.id === actionId) || null;
  }

  clear() {
    this.actions = [];
    logger.info("Action history cleared");
  }

  getStats() {
    const total = this.actions.length;
    const successCount = this.actions.filter((a) => a.status === "success").length;
    const failedCount = this.actions.filter((a) => a.status === "failed").length;

    return {
      total,
      success: successCount,
      failed: failedCount,
    };
  }
}

const actionHistoryService = new ActionHistoryService();

export default actionHistoryService;
