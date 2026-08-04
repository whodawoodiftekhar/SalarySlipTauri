import { Router } from "express";
import { Employee } from "../models/Employee.js";
import { Payslip } from "../models/Payslip.js";
import { CATALOG_SORT, SalaryComponent } from "../models/SalaryComponent.js";
import { SalaryStructure } from "../models/SalaryStructure.js";
import { makeStructure, num } from "../lib/calc.js";

const router = Router();

/** Which employee field feeds a given structure line. */
const fieldFor = (component) => {
  if (component.isBasic || component.id === "basic") return "basic";
  if (component.id === "project") return "projectAllowance";
  return component.id;
};

/**
 * Pushes edited profile amounts into the employee's saved structure.
 *
 * Payroll is always costed from the structure, so without this a raise typed
 * into the profile never reaches the payslip — the screen keeps showing the
 * amount the structure was created with.
 *
 * Only lines whose field actually changed in this edit are touched, so a
 * structure HR tuned on the payroll screen is not silently reset by an
 * unrelated edit to, say, a bank account. Custom lines, prorate flags and calc
 * methods are never rewritten.
 */
const syncStructureToProfile = async (employeeId, patch, before) => {
  const structure = await SalaryStructure.findOne({ employeeId });
  if (!structure || !Array.isArray(structure.components)) return;

  let changed = false;
  for (const component of structure.components) {
    // statutory PF derives its amount from Basic; its stored value is never read
    if (component.calc === "statutory_pf") continue;

    const field = fieldFor(component);
    if (!(field in patch)) continue;
    if (num(patch[field]) === num(before[field])) continue;

    component.value = num(patch[field]);
    changed = true;
  }

  if (!changed) return;
  // `value` is Mixed, so mongoose needs telling the subdocuments moved
  structure.markModified("components");
  await structure.save();
};

/** GET /api/employees — full roster */
router.get("/", async (req, res) => {
  const employees = await Employee.find().sort({ createdAt: -1, id: -1 });
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
  try {
    const { id } = req.body;
    if (id) {
      const existing = await Employee.findOne({ id: id.trim() });
      if (existing) {
        return res.status(400).json({
          message: `Employee Code "${id}" already exists. Please use a unique Employee Code.`,
        });
      }
    }

    const employee = await Employee.create(req.body);

    const dbCatalog = await SalaryComponent.find().sort(CATALOG_SORT).lean();

    await SalaryStructure.findOneAndUpdate(
      { employeeId: employee.id },
      {
        employeeId: employee.id,
        components: makeStructure(req.body, dbCatalog),
      },
      { upsert: true, returnDocument: "after" },
    );

    res.status(201).json(employee);
  } catch (err) {
    console.error("Error creating employee:", err);
    res.status(500).json({
      message: err.message || "Failed to create employee",
    });
  }
});

/** PUT /api/employees/:id — update the employee record and its structure */
router.put("/:id", async (req, res) => {
  // read first: the sync below only acts on amounts this edit actually changed
  const before = await Employee.findOne({ id: req.params.id }).lean();
  if (!before) return res.status(404).json({ message: "Employee not found" });

  const employee = await Employee.findOneAndUpdate(
    { id: req.params.id },
    req.body,
    { returnDocument: "after", runValidators: true },
  );

  if (!employee) return res.status(404).json({ message: "Employee not found" });

  await syncStructureToProfile(employee.id, req.body, before);
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
    const dbCatalog = await SalaryComponent.find().sort(CATALOG_SORT).lean();
    structure = await SalaryStructure.create({
      employeeId: employee.id,
      components: makeStructure(employee, dbCatalog),
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
