import express from "express";
import { createPat, listPats, revokePat } from "../controllers/pat.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";

const router = express.Router();

router.use(authMiddleware);

router.post("/", createPat);
router.get("/", listPats);
router.delete("/:id", revokePat);

export default router;
