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

/**
 * PUT /api/salary-components/:code — the code in the path is the current one.
 *
 * The code itself is editable. It is what the employee salary form stores an
 * amount under and what `makeStructure` derives a line id from, so a rename
 * reaches structures generated from here on; structures already saved keep the
 * lines they hold and go on paying the same rupees. The clash is checked here
 * rather than left to the unique index so HR gets a sentence, not a driver error.
 */
router.put("/:code", async (req, res) => {
  const { code, name, group, calc, taxable, order } = req.body;
  const current = req.params.code.toUpperCase();
  const renamed = code == null ? "" : String(code).trim().toUpperCase();

  if (renamed && renamed !== current) {
    const taken = await SalaryComponent.findOne({ code: renamed }).lean();
    if (taken) {
      return res.status(409).json({
        message: `Component code "${renamed}" already belongs to ${taken.name}. Pick another code.`,
      });
    }
  }

  const item = await SalaryComponent.findOneAndUpdate(
    { code: current },
    {
      name,
      group,
      calc,
      taxable,
      ...(renamed ? { code: renamed } : {}),
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
