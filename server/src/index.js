import express from "express";
import containersRoutes from "./routes/containers.routes.js";
import healthRoutes from "./routes/health.routes.js";
import errorHandler from "./middlewares/errorHandler.js";
import logger from "./utils/logger.js";
import requestLogger from "./middlewares/requestLogger.js";
import dotenv from "dotenv";

dotenv.config();

const PORT = process.env.PORT || 4000;
const app = express();

// Middlewares
app.use(express.json());
app.use(requestLogger);

// Routes
app.use("/health", healthRoutes);
app.use("/containers", containersRoutes);

// Error Handling Middleware
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`DevOpsEase server running on http://localhost:${PORT}`);
});
