import Alert, { ALERT_TYPES, ALERT_SEVERITIES } from "../models/alert.model.js";
import alertBroadcaster from "../websocket/alertBroadcaster.js";
import logger from "../utils/logger.js";

// Deduplication window — do not create a duplicate unresolved alert
// of the same type + containerId within this window.
const DEDUP_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

class AlertService {
  async createAlert({ userId, containerId = null, type, severity, message, metadata = {} }) {
    if (!userId || !type || !severity || !message) {
      logger.warn("AlertService.createAlert called with missing fields", { userId, type, severity });
      return null;
    }

    try {
      // Deduplication: check for identical unresolved alert within window
      const dedupCutoff = new Date(Date.now() - DEDUP_WINDOW_MS);
      const existing = await Alert.findOne({
        userId,
        containerId,
        type,
        resolved: false,
        createdAt: { $gte: dedupCutoff },
      }).lean();

      if (existing) {
        logger.debug("Alert deduplicated — skipping", { type, containerId });
        return null;
      }

      const alert = await Alert.create({
        userId,
        containerId,
        type,
        severity,
        message,
        metadata,
      });

      logger.info("Alert created", {
        alertId: alert._id,
        type,
        severity,
        containerId,
        userId: String(userId),
      });

      // Broadcast to connected clients
      alertBroadcaster.broadcast(userId, alert.toObject());

      return alert;
    } catch (err) {
      logger.error("AlertService.createAlert failed", { error: err.message, type, userId: String(userId) });
      return null;
    }
  }
// Fetch alerts for a user with optional filters and pagination
  async getAlerts(userId, { resolved, limit = 50, page = 1 } = {}) {
    const filter = { userId };
    if (resolved !== undefined) {
      filter.resolved = resolved;
    }

    const skip = (page - 1) * limit;

    const [alerts, total] = await Promise.all([
      Alert.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Alert.countDocuments(filter),
    ]);

    return { alerts, total, page, limit };
  }

// Get count of unresolved alerts for a user
  async getUnresolvedCount(userId) {
    return Alert.countDocuments({ userId, resolved: false });
  }

// Resolve a single alert by ID (only if it belongs to the user)
  async resolveAlert(alertId, userId) {
    const alert = await Alert.findOneAndUpdate(
      { _id: alertId, userId },
      { $set: { resolved: true, resolvedAt: new Date() } },
      { new: true }
    );
    if (alert) {
      logger.info("Alert resolved", { alertId, userId: String(userId) });
    }
    return alert;
  }

  // Resolve all unresolved alerts for a user.
  async resolveAll(userId) {
    const result = await Alert.updateMany(
      { userId, resolved: false },
      { $set: { resolved: true, resolvedAt: new Date() } }
    );
    logger.info("All alerts resolved", { userId: String(userId), count: result.modifiedCount });
    return result.modifiedCount;
  }
// Resolve all unresolved alerts for a specific container (used when container is deleted)

  async resolveByContainer(containerId, userId) {
    const result = await Alert.updateMany(
      { containerId, userId, resolved: false },
      { $set: { resolved: true, resolvedAt: new Date() } }
    );
    return result.modifiedCount;
  }
}

export { ALERT_TYPES, ALERT_SEVERITIES };
export default new AlertService();
