const express = require("express");
const containersRoutes = require("./routes/containers.routes");

const app = express();

app.get("/health", (req, res) => {
  res.json({ status: "DevOpsEase backend running" });
});

app.use("/containers", containersRoutes);

app.listen(4000, () => {
  console.log("DevOpsEase server running on http://localhost:4000");
});
