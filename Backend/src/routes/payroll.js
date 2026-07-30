import { Router } from "express";
import { Employee } from "../models/Employee.js";
import { Payslip } from "../models/Payslip.js";
import { SalaryStructure } from "../models/SalaryStructure.js";
import { getSettings } from "../models/Settings.js";
import { compute, makeStructure } from "../lib/calc.js";

const router = Router();

/**
 * GET /api/payroll/roster — every employee with their standard-month payroll.
 *
 * Computed from each employee's *saved* structure, so edits HR made on the
 * payroll screen are reflected here (a shared default template would not).
 */
router.get("/roster", async (req, res) => {
  try {
    const settings = await getSettings();
    const days = Number(req.query.days ?? settings?.standardDays ?? 30);

    const employees = await Employee.find().sort({ id: 1 }).lean();
    if (!employees || !Array.isArray(employees) || employees.length === 0) {
      return res.json([]);
    }

    const structures = await SalaryStructure.find().lean();
    const componentsFor = new Map(
      (structures || []).map((s) => [s.employeeId, s.components]),
    );

    const roster = employees.map((e) => {
      const { _id, createdAt, updatedAt, ...employee } = e;
      let components = componentsFor.get(e.id);
      if (!Array.isArray(components) || components.length === 0) {
        components = makeStructure(e);
      }
      return { ...employee, ...compute(components, days, days) };
    });

    res.json(roster);
  } catch (err) {
    console.error("Error computing roster:", err);
    res.json([]);
  }
});

/**
 * POST /api/payroll/preview — net estimate for an employee that doesn't exist
 * yet, used by the add-employee form.
 */
router.post("/preview", async (req, res) => {
  const { basic, special, onsite, tds, daysInMonth, daysPayable } = req.body;

  if (basic == null) {
    return res.status(400).json({ message: "basic is required" });
  }

  const settings = await getSettings();
  const days = settings.standardDays;

  const components = makeStructure({ basic, special, onsite, tds });
  res.json(
    compute(
      components,
      Number(daysInMonth ?? days),
      Number(daysPayable ?? days),
    ),
  );
});

/**
 * POST /api/payroll/payslips — finalize a run.
 *
 * Totals are recomputed here rather than trusted from the client, and the
 * edited structure is saved back so reopening the screen shows the same lines.
 * Re-finalizing the same employee+period overwrites the previous slip.
 */
router.post("/payslips", async (req, res) => {
  const { employeeId, period, daysInMonth, daysPayable, components } = req.body;

  if (!employeeId || !period) {
    return res.status(400).json({ message: "employeeId and period are required" });
  }
  if (!Array.isArray(components) || components.length === 0) {
    return res.status(400).json({ message: "components must be a non-empty array" });
  }

  const employee = await Employee.findOne({ id: employeeId });
  if (!employee) return res.status(404).json({ message: "Employee not found" });

  const result = compute(components, Number(daysInMonth), Number(daysPayable));

  await SalaryStructure.findOneAndUpdate(
    { employeeId },
    { components },
    { upsert: true, runValidators: true },
  );

  const payslip = await Payslip.findOneAndUpdate(
    { employeeId, period },
    { employeeId, period, daysInMonth, daysPayable, components, result },
    { returnDocument: "after", upsert: true, runValidators: true },
  );

  res.status(201).json(payslip);
});

/** GET /api/payroll/payslips?employeeId=&period= */
router.get("/payslips", async (req, res) => {
  const filter = {};
  if (req.query.employeeId) filter.employeeId = req.query.employeeId;
  if (req.query.period) filter.period = req.query.period;

  const payslips = await Payslip.find(filter).sort({ createdAt: -1 });
  res.json(payslips);
});

/** GET /api/payroll/payslips/:id */
router.get("/payslips/:id", async (req, res) => {
  const payslip = await Payslip.findById(req.params.id);
  if (!payslip) return res.status(404).json({ message: "Payslip not found" });
  res.json(payslip);
});

/** DELETE /api/payroll/payslips/:id */
router.delete("/payslips/:id", async (req, res) => {
  const payslip = await Payslip.findByIdAndDelete(req.params.id);
  if (!payslip) return res.status(404).json({ message: "Payslip not found" });
  res.json({ id: req.params.id, deleted: true });
});

export default router;
