import { Router } from "express";
import { DEFAULT_SETTINGS, getSettings } from "../models/Settings.js";

const router = Router();

/** GET /api/settings — returns org config */
router.get("/", async (req, res) => {
  res.json(await getSettings());
});

/** PUT /api/settings */
router.put("/", async (req, res) => {
  res.json(DEFAULT_SETTINGS);
});

export default router;
