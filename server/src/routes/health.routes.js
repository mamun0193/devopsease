import express from "express";
import readinessService from "../services/readiness.service.js";
import { isDBConnected } from "../config/db.js";

const router = express.Router();

router.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: "running",
      database: isDBConnected() ? "connected" : "disconnected",
      timestamp: new Date().toISOString(),
    },
    message: "Health check passed",
  });
});

router.get("/ready", (req, res) => {
  const status = readinessService.getStatus();
  const statusCode = status.ready ? 200 : 503;
  res.status(statusCode).json({
    success: status.ready,
    data: status,
    message: status.ready ? "Server is ready" : "Server is initializing...",
  });
});

export default router;
