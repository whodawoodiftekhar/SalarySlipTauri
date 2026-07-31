import { Router } from "express";
import { getSettings, updateSettings } from "../models/Settings.js";

const router = Router();

/** GET /api/settings — returns org config */
router.get("/", async (req, res) => {
  try {
    const settings = await getSettings();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch settings", error: err.message });
  }
});

/** PUT /api/settings — update org config & company setup */
router.put("/", async (req, res) => {
  try {
    const updated = await updateSettings(req.body);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: "Failed to update settings", error: err.message });
  }
});

export default router;

