const express = require("express");
const containersRoutes = require("./routes/containers.routes");
const healthRoutes = require("./routes/health.routes");
const errorHandler = require("./middlewares/errorHandler");
const logger = require("./utils/logger");
const requestLogger = require("./middlewares/requestLogger");
const dotenv = require("dotenv");

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
