import { Router } from "express";
import { getSettings, Settings } from "../models/Settings.js";

const router = Router();

/** GET /api/settings — the whole org config the UI boots from */
router.get("/", async (req, res) => {
  res.json(await getSettings());
});

/** PUT /api/settings — partial update */
router.put("/", async (req, res) => {
  const { company, payPeriod, standardDays, departments, slipDefaults, currentUser } =
    req.body;

  const settings = await Settings.findOneAndUpdate(
    { key: "app" },
    { company, payPeriod, standardDays, departments, slipDefaults, currentUser },
    { returnDocument: "after", upsert: true, runValidators: true },
  );

  res.json(settings);
});

export default router;
