import express from "express";
import { handleGitHubWebhook } from "../controllers/webhook.controller.js";

const router = express.Router();

const githubRawBody = express.raw({
  type: "application/json",
  limit: "1mb",
});

router.post("/github", githubRawBody, handleGitHubWebhook);

export default router;
