import crypto from "crypto";
import WebhookEndpoint from "../../models/webhookEndpoint.model.js";
import WebhookDelivery from "../../models/webhookDelivery.model.js";

const MAX_ATTEMPTS = 5;
const MAX_CONSECUTIVE_FAILURES = 10;
const INITIAL_BACKOFF_MS = 1000;

export const WebhookDispatcher = {
  /**
   * Main entry point to dispatch an event to all matching webhook endpoints.
   * Expected to be called by the Platform Event Bus.
   */
  async dispatchEvent(eventType, payload, projectId = null) {
    // 1. Find all endpoints matching the event type
    // (A real implementation might use Redis pub/sub or a database query based on the wildcard pattern)
    // For simplicity, we fetch active endpoints for the project or global ones and filter in memory.
    const query = { isActive: true };
    if (projectId) {
      query.$or = [{ project: projectId }, { project: null }];
    } else {
      query.project = null;
    }

    const endpoints = await WebhookEndpoint.find(query);
    const matchingEndpoints = endpoints.filter((endpoint) =>
      this._matchesSubscription(eventType, endpoint.subscriptions)
    );

    // 2. Queue delivery records
    const deliveries = await Promise.all(
      matchingEndpoints.map((endpoint) =>
        this._createDeliveryRecord(endpoint, eventType, payload)
      )
    );

    // 3. Kick off processing asynchronously
    deliveries.forEach((delivery) => this._processDelivery(delivery._id).catch(console.error));
  },

  _matchesSubscription(eventType, subscriptions) {
    // Basic wildcard matching (e.g., "build.*" matches "build.succeeded")
    return subscriptions.some((sub) => {
      const regex = new RegExp("^" + sub.replace(/\*/g, ".*") + "$");
      return regex.test(eventType);
    });
  },

  async _createDeliveryRecord(endpoint, eventType, payload) {
    const delivery = new WebhookDelivery({
      endpoint: endpoint._id,
      eventTypes: [eventType],
      status: "pending",
      requestPayload: payload,
    });
    return delivery.save();
  },

  async _processDelivery(deliveryId) {
    const delivery = await WebhookDelivery.findById(deliveryId).populate("endpoint");
    if (!delivery || !delivery.endpoint || !delivery.endpoint.isActive) return;

    delivery.attemptCount += 1;
    const startTime = Date.now();

    try {
      const bodyString = JSON.stringify(delivery.requestPayload);
      const signature = this._generateSignature(
        bodyString,
        delivery.endpoint.signingSecret
      );

      const response = await fetch(delivery.endpoint.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-DevOpsEase-Signature-256": signature,
          "X-DevOpsEase-Event": delivery.eventTypes.join(","),
          "X-DevOpsEase-Delivery": delivery._id.toString(),
        },
        body: bodyString,
      });

      const responseBody = await response.text();
      delivery.deliveryTimeMs = Date.now() - startTime;
      delivery.statusCode = response.status;
      delivery.responseBody = responseBody.substring(0, 1000); // Truncate

      if (response.ok) {
        delivery.status = "success";
        await this._handleSuccess(delivery.endpoint);
      } else {
        throw new Error(`HTTP Error: ${response.status}`);
      }
    } catch (error) {
      delivery.deliveryTimeMs = Date.now() - startTime;
      delivery.errorMessage = error.message;

      if (delivery.attemptCount >= MAX_ATTEMPTS) {
        delivery.status = "dead_letter";
        await this._handleFailure(delivery.endpoint);
      } else {
        delivery.status = "failed";
        // Exponential backoff
        delivery.nextRetryAt = new Date(Date.now() + INITIAL_BACKOFF_MS * Math.pow(2, delivery.attemptCount - 1));
      }
    }

    await delivery.save();
  },

  /**
   * Processes all pending retries. Intended to be called by PlatformScheduler.
   */
  async processRetries() {
    const retries = await WebhookDelivery.find({
      status: "failed",
      nextRetryAt: { $lte: new Date() }
    });

    for (const delivery of retries) {
      // Fire and forget or await, but catch errors to prevent loop failure
      this._processDelivery(delivery._id).catch(console.error);
    }
  },

  async _handleSuccess(endpoint) {
    if (endpoint.consecutiveFailures > 0) {
      endpoint.consecutiveFailures = 0;
      await endpoint.save();
    }
  },

  async _handleFailure(endpoint) {
    endpoint.consecutiveFailures += 1;
    if (endpoint.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      endpoint.isActive = false;
      console.warn(`Webhook endpoint ${endpoint._id} auto-disabled due to repeated failures.`);
    }
    await endpoint.save();
  },

  _generateSignature(rawBodyString, secret) {
    const hmac = crypto.createHmac("sha256", secret);
    hmac.update(rawBodyString);
    return `sha256=${hmac.digest("hex")}`;
  },
};
