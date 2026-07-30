import { Router } from "express";
import { SalaryComponent } from "../models/SalaryComponent.js";

const router = Router();

/** GET /api/salary-components */
router.get("/", async (req, res) => {
  const items = await SalaryComponent.find().sort({ group: 1, code: 1 });
  res.json(items);
});

/** POST /api/salary-components */
router.post("/", async (req, res) => {
  const { code, name, group, calc, taxable } = req.body;
  const item = await SalaryComponent.create({ code, name, group, calc, taxable });
  res.status(201).json(item);
});

/** PUT /api/salary-components/:code */
router.put("/:code", async (req, res) => {
  const { name, group, calc, taxable } = req.body;
  const item = await SalaryComponent.findOneAndUpdate(
    { code: req.params.code.toUpperCase() },
    { name, group, calc, taxable },
    { returnDocument: "after", runValidators: true },
  );
  if (!item) return res.status(404).json({ message: "Component not found" });
  res.json(item);
});

/** DELETE /api/salary-components/:code */
router.delete("/:code", async (req, res) => {
  const item = await SalaryComponent.findOneAndDelete({
    code: req.params.code.toUpperCase(),
  });
  if (!item) return res.status(404).json({ message: "Component not found" });
  res.json({ code: item.code, deleted: true });
});

export default router;
