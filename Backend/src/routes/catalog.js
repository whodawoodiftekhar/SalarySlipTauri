import { Router } from "express";
import { CATALOG_SORT, SalaryComponent } from "../models/SalaryComponent.js";

const router = Router();

/** Position a new component last, so adding one never reshuffles the form. */
const nextOrder = async () => {
  const last = await SalaryComponent.findOne().sort({ order: -1 }).lean();
  return (Number(last?.order) || 0) + 1;
};

/** GET /api/salary-components — in HR's display order */
router.get("/", async (req, res) => {
  const items = await SalaryComponent.find().sort(CATALOG_SORT);
  res.json(items);
});

/** POST /api/salary-components */
router.post("/", async (req, res) => {
  const { code, name, group, calc, taxable, order } = req.body;
  const item = await SalaryComponent.create({
    code,
    name,
    group,
    calc,
    taxable,
    order: order == null || order === "" ? await nextOrder() : Number(order),
  });
  res.status(201).json(item);
});

/** PUT /api/salary-components/:code */
router.put("/:code", async (req, res) => {
  const { name, group, calc, taxable, order } = req.body;
  const item = await SalaryComponent.findOneAndUpdate(
    { code: req.params.code.toUpperCase() },
    {
      name,
      group,
      calc,
      taxable,
      ...(order == null || order === "" ? {} : { order: Number(order) }),
    },
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
