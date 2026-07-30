import { Router } from "express";
import { Employee } from "../models/Employee.js";
import { Payslip } from "../models/Payslip.js";
import { SalaryStructure } from "../models/SalaryStructure.js";
import { makeStructure } from "../lib/calc.js";

const router = Router();

/** GET /api/employees — full roster */
router.get("/", async (req, res) => {
  const employees = await Employee.find().sort({ id: 1 });
  res.json(employees);
});

/**
 * GET /api/employees/next-code — next free code, e.g. C11026.
 * Declared before "/:id" or Express would treat "next-code" as an id.
 */
router.get("/next-code", async (req, res) => {
  const employees = await Employee.find({}, "id").lean();
  const nums = employees
    .map((e) => parseInt(String(e.id).replace(/\D/g, ""), 10))
    .filter((n) => !isNaN(n));
  res.json({ code: "C" + ((nums.length ? Math.max(...nums) : 11019) + 1) });
});

/** GET /api/employees/:id */
router.get("/:id", async (req, res) => {
  const employee = await Employee.findOne({ id: req.params.id });
  if (!employee) return res.status(404).json({ message: "Employee not found" });
  res.json(employee);
});

/** POST /api/employees — create, and attach the default salary structure */
router.post("/", async (req, res) => {
  const { id, name, dept, role, basic, special, tds, onsite } = req.body;

  const employee = await Employee.create({
    id,
    name,
    dept,
    role,
    basic,
    special,
    tds,
    onsite,
  });

  await SalaryStructure.create({
    employeeId: employee.id,
    components: makeStructure(employee),
  });

  res.status(201).json(employee);
});

/** PUT /api/employees/:id — update the employee record */
router.put("/:id", async (req, res) => {
  const { name, dept, role, basic, special, tds, onsite } = req.body;

  const employee = await Employee.findOneAndUpdate(
    { id: req.params.id },
    { name, dept, role, basic, special, tds, onsite },
    { returnDocument: "after", runValidators: true },
  );

  if (!employee) return res.status(404).json({ message: "Employee not found" });
  res.json(employee);
});

/** DELETE /api/employees/:id — removes their structure and payslips too */
router.delete("/:id", async (req, res) => {
  const employee = await Employee.findOneAndDelete({ id: req.params.id });
  if (!employee) return res.status(404).json({ message: "Employee not found" });

  await SalaryStructure.deleteOne({ employeeId: req.params.id });
  await Payslip.deleteMany({ employeeId: req.params.id });

  res.json({ id: req.params.id, deleted: true });
});

/**
 * GET /api/employees/:id/salary-structure
 * Builds the default on first read so older rows self-heal.
 */
router.get("/:id/salary-structure", async (req, res) => {
  const employee = await Employee.findOne({ id: req.params.id });
  if (!employee) return res.status(404).json({ message: "Employee not found" });

  let structure = await SalaryStructure.findOne({ employeeId: employee.id });
  if (!structure) {
    structure = await SalaryStructure.create({
      employeeId: employee.id,
      components: makeStructure(employee),
    });
  }

  res.json(structure.components);
});

/** PUT /api/employees/:id/salary-structure — persist HR's edits */
router.put("/:id/salary-structure", async (req, res) => {
  const components = req.body;
  if (!Array.isArray(components)) {
    return res.status(400).json({ message: "Body must be an array of components" });
  }

  const structure = await SalaryStructure.findOneAndUpdate(
    { employeeId: req.params.id },
    { components },
    { returnDocument: "after", upsert: true, runValidators: true },
  );

  res.json(structure.components);
});

export default router;
