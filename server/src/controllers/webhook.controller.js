import Repository from "../models/repository.model.js";
import logger from "../utils/logger.js";
import { verifyGitHubSignature } from "../helpers/githubSignature.helper.js";

const processedDeliveries = new Set();
const deliveryOrder = [];
const MAX_TRACKED_DELIVERIES = 10000;

const webhookSecret = process.env.WEBHOOK_SECRET || "";

if (!webhookSecret) {
  logger.warn("GitHub webhook secret is missing", { event: "webhook_config", status: "invalid" });
}

function normalizeBranch(ref) {
  if (!ref || typeof ref !== "string") return "unknown";
  return ref.startsWith("refs/heads/") ? ref.replace("refs/heads/", "") : ref;
}

function markDeliveryProcessed(deliveryId) {
  if (!deliveryId || processedDeliveries.has(deliveryId)) return;

  processedDeliveries.add(deliveryId);
  deliveryOrder.push(deliveryId);

  if (deliveryOrder.length > MAX_TRACKED_DELIVERIES) {
    const oldest = deliveryOrder.shift();
    if (oldest) processedDeliveries.delete(oldest);
  }
}

function isDuplicateDelivery(deliveryId) {
  if (!deliveryId) return false;
  return processedDeliveries.has(deliveryId);
}

export async function triggerPipeline(repo, payload) {
  logger.info("Webhook pipeline trigger queued", {
    event: "push",
    owner: repo.owner,
    repo: repo.repoName,
    deliveryId: payload?.deliveryId,
    status: "processed",
  });
}

export async function handleGitHubWebhook(req, res) {
  const eventType = req.get("x-github-event") || "unknown";
  const signature = req.get("x-hub-signature-256") || "";
  const deliveryId = req.get("x-github-delivery") || "";
  const rawBody = req.body;

  if (!Buffer.isBuffer(rawBody)) {
    logger.warn("Webhook raw body missing or invalid", {
      event: eventType,
      deliveryId,
      status: "invalid",
    });
    return res.status(400).json({ success: false, message: "Invalid webhook body" });
  }

  const verification = verifyGitHubSignature(rawBody, signature, webhookSecret);

  if (!verification.valid) {
    logger.warn("GitHub webhook signature verification failed", {
      event: eventType,
      deliveryId,
      status: "invalid",
      reason: verification.reason,
    });
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  if (isDuplicateDelivery(deliveryId)) {
    logger.info("Duplicate GitHub delivery ignored", {
      event: eventType,
      deliveryId,
      status: "duplicate",
    });
    return res.status(200).json({ success: true, status: "duplicate" });
  }

  if (eventType !== "push") {
    markDeliveryProcessed(deliveryId);
    logger.info("GitHub webhook event ignored", {
      event: eventType,
      deliveryId,
      status: "ignored",
    });
    return res.status(200).json({ success: true, status: "ignored" });
  }

  let payload;
  try {
    payload = JSON.parse(rawBody.toString("utf8"));
  } catch {
    logger.warn("Invalid webhook JSON payload", {
      event: eventType,
      deliveryId,
      status: "invalid",
    });
    return res.status(400).json({ success: false, message: "Invalid JSON payload" });
  }

  const owner = payload?.repository?.owner?.login || payload?.repository?.owner?.name || "unknown";
  const repoName = payload?.repository?.name || "unknown";
  const branch = normalizeBranch(payload?.ref);
  const commitId = payload?.after || "unknown";
  const commitMessage = payload?.head_commit?.message || "unknown";
  const author = payload?.head_commit?.author?.name || payload?.pusher?.name || "unknown";

  const repo = await Repository.findOne({ owner, repoName, provider: "github" }).lean();

  if (!repo) {
    markDeliveryProcessed(deliveryId);
    logger.warn("Webhook repository not found", {
      event: eventType,
      deliveryId,
      owner,
      repo: repoName,
      branch,
      commitId,
      author,
      status: "ignored",
    });
    return res.status(200).json({ success: true, status: "ignored" });
  }

  logger.info("GitHub push webhook processed", {
    event: eventType,
    deliveryId,
    owner,
    repo: repoName,
    branch,
    commitId,
    author,
    commitMessage,
    status: "processed",
  });

  setImmediate(() => {
    triggerPipeline(repo, { ...payload, deliveryId }).catch((error) => {
      logger.error("Webhook pipeline trigger failed", {
        event: eventType,
        deliveryId,
        owner,
        repo: repoName,
        branch,
        commitId,
        author,
        status: "invalid",
        error: error.message,
      });
    });
  });

  markDeliveryProcessed(deliveryId);
  return res.status(200).json({ success: true, status: "processed" });
}
