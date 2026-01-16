const express = require("express");

const router = express.Router();

router.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: "running",
      timestamp: new Date().toISOString(),
    },
    message: "Health check passed",
  });
});

module.exports = router;
