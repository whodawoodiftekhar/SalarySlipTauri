/**
 * Bulk month-end payroll — mounted at /api/payroll/run.
 *
 * The per-employee screen stays the place to edit a structure; this router is
 * for the repetitive part HR does twelve times a year: compute everyone for a
 * period, review the totals, finalize in one pass, then get the PDFs out.
 *
 * Every route computes from each employee's *saved* structure with the shared
 * engine, so a bulk run and a single finalize on the same employee produce the
 * same rupees.
 */
import { Router } from "express";
import { compute, makeStructure, round2 } from "../lib/calc.js";
import { daysInPeriod } from "../lib/period.js";
import { exportPayslipPdfs } from "../lib/payslipExport.js";
import { deliverPayslip } from "../lib/payslipMailer.js";
import { Employee } from "../models/Employee.js";
import { PayPeriodDays, upsertDayCount } from "../models/PayPeriodDays.js";
import { Payslip } from "../models/Payslip.js";
import { SalaryComponent } from "../models/SalaryComponent.js";
import { SalaryStructure } from "../models/SalaryStructure.js";
import { getSettings } from "../models/Settings.js";

const router = Router();

const clampDays = (value, dim) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return dim;
  return Math.min(Math.max(n, 0), dim);
};

/**
 * Whether day-rating is actually in effect for a part-month.
 *
 * `prorate` is a per-line flag HR ticks on the employee's payroll screen and it
 * is stored with the structure, so a run has nothing of its own to decide: if no
 * line is marked, fewer days pays a full month and the row says so.
 */
const isDayRated = (components, hasLop) =>
  hasLop && components.some((c) => c.prorate);

const sumRows = (rows) =>
  rows.reduce(
    (acc, r) => ({
      headcount: acc.headcount + 1,
      gross: round2(acc.gross + r.gross),
      totalDeductions: round2(acc.totalDeductions + r.totalDeductions),
      net: round2(acc.net + r.net),
    }),
    { headcount: 0, gross: 0, totalDeductions: 0, net: 0 },
  );

/**
 * Computes the run for the requested employees without writing anything.
 *
 * @param body.period        e.g. "Jul 2026"
 * @param body.daysInMonth   defaults to the company standard days
 * @param body.employeeIds   omit for the whole roster
 * @param body.days          per-employee days payable, keyed by employee id
 */
async function buildRun(body = {}) {
  const settings = await getSettings();
  const standardDays = Number(settings?.standardDays ?? 30);
  const period = String(body.period ?? settings?.payPeriod ?? "").trim();

  const requestedDim = Number(body.daysInMonth);
  const daysInMonth = requestedDim > 0 ? requestedDim : standardDays;

  const ids = Array.isArray(body.employeeIds) ? body.employeeIds.filter(Boolean) : null;
  const filter = ids && ids.length > 0 ? { id: { $in: ids } } : {};

  const [employees, structures, catalog, existing, dayCounts] = await Promise.all([
    Employee.find(filter).lean(),
    SalaryStructure.find(filter.id ? { employeeId: filter.id } : {}).lean(),
    SalaryComponent.find().lean(),
    period ? Payslip.find({ period }).lean() : Promise.resolve([]),
    period ? PayPeriodDays.find({ period }).lean() : Promise.resolve([]),
  ]);

  const structureFor = new Map(structures.map((s) => [s.employeeId, s.components]));
  const slipFor = new Map(existing.map((p) => [p.employeeId, p]));
  /** LOP entered on the per-employee screen for this period */
  const savedDaysFor = new Map(dayCounts.map((d) => [d.employeeId, d.daysPayable]));
  const perEmployeeDays = body.days ?? {};

  const rows = employees.map((employee) => {
    const saved = structureFor.get(employee.id);
    const hasStructure = Array.isArray(saved) && saved.length > 0;
    const components = hasStructure ? saved : makeStructure(employee, catalog);

    // an explicit request value wins, then whatever HR saved for this period on
    // the per-employee screen, and only then a full month
    const daysPayable = clampDays(
      perEmployeeDays[employee.id] ?? savedDaysFor.get(employee.id) ?? daysInMonth,
      daysInMonth,
    );
    const hasLop = daysPayable < daysInMonth;

    const result = compute(components, daysInMonth, daysPayable);
    const slip = slipFor.get(employee.id);
    const dayRated = isDayRated(components, hasLop);

    return {
      employeeId: employee.id,
      employeeName: employee.name,
      dept: employee.dept ?? "",
      role: employee.role ?? "",
      email: employee.email ?? "",
      daysInMonth,
      daysPayable,
      lopDays: round2(daysInMonth - daysPayable),
      gross: result.gross,
      totalDeductions: result.totalDeductions,
      net: result.net,
      factor: result.factor,
      dayRated,
      /** LOP entered but nothing in the structure day-rates — pay is unchanged */
      lopHasNoEffect: hasLop && !dayRated,
      /** the day count came from the LOP register, not from this request */
      daysFromRegister:
        perEmployeeDays[employee.id] == null && savedDaysFor.has(employee.id),
      hasStructure,
      hasEmail: Boolean(employee.email),
      alreadyFinalized: Boolean(slip),
      previousNet: slip?.result?.net ?? null,
      // kept out of the response, used by the finalize pass
      _components: components,
      _employee: employee,
    };
  });

  rows.sort((a, b) => a.employeeName.localeCompare(b.employeeName));

  return { settings, period, daysInMonth, standardDays, rows };
}

/** Strips the internal fields before a row goes over the wire. */
const publicRow = ({ _components, _employee, ...row }) => row;

const runResponse = (
  { period, daysInMonth, standardDays, rows },
  { includeComponents = false } = {},
) => ({
  period,
  daysInMonth,
  standardDays,
  calendarDays: daysInPeriod(period),
  // the preview ships the structures so the screen can re-total a day change
  // with the same engine instead of a round trip per keystroke
  rows: rows.map((r) =>
    includeComponents
      ? { ...publicRow(r), components: r._components }
      : publicRow(r),
  ),
  summary: {
    ...sumRows(rows),
    alreadyFinalized: rows.filter((r) => r.alreadyFinalized).length,
    missingEmail: rows.filter((r) => !r.hasEmail).length,
    missingStructure: rows.filter((r) => !r.hasStructure).length,
    withLop: rows.filter((r) => r.lopDays > 0).length,
    lopWithoutEffect: rows.filter((r) => r.lopHasNoEffect).length,
  },
});

/**
 * POST /api/payroll/run/preview — what the run would produce.
 *
 * Flags employees who already have a slip for the period, because finalizing
 * again overwrites it.
 */
router.post("/preview", async (req, res) => {
  const run = await buildRun(req.body);
  if (!run.period) {
    return res.status(400).json({ message: "period is required" });
  }
  res.json(runResponse(run, { includeComponents: true }));
});

/**
 * POST /api/payroll/run — finalize every selected employee for the period.
 *
 * Recomputed here rather than trusted from the client, one employee at a time
 * so a single bad structure cannot abort the whole run.
 */
router.post("/", async (req, res) => {
  const run = await buildRun(req.body);
  if (!run.period) {
    return res.status(400).json({ message: "period is required" });
  }
  if (run.rows.length === 0) {
    return res.status(400).json({ message: "No employees matched this run" });
  }

  const results = [];

  for (const row of run.rows) {
    try {
      // an employee with no stored structure gets the generated one persisted,
      // otherwise every future run would rebuild it from scratch
      if (!row.hasStructure) {
        await SalaryStructure.findOneAndUpdate(
          { employeeId: row.employeeId },
          { employeeId: row.employeeId, components: row._components },
          { upsert: true, runValidators: true },
        );
      }

      const payslip = await Payslip.findOneAndUpdate(
        { employeeId: row.employeeId, period: run.period },
        {
          employeeId: row.employeeId,
          period: run.period,
          daysInMonth: row.daysInMonth,
          daysPayable: row.daysPayable,
          components: row._components,
          result: compute(row._components, row.daysInMonth, row.daysPayable),
        },
        { returnDocument: "after", upsert: true, runValidators: true },
      );

      await upsertDayCount({
        employeeId: row.employeeId,
        period: run.period,
        daysInMonth: row.daysInMonth,
        daysPayable: row.daysPayable,
      });

      results.push({
        ...publicRow(row),
        payslipId: String(payslip._id),
        status: row.alreadyFinalized ? "replaced" : "finalized",
      });
    } catch (err) {
      console.error(`[Pay Run] ${row.employeeId} failed:`, err);
      results.push({
        ...publicRow(row),
        payslipId: null,
        status: "error",
        message: err.message || "Could not finalize this payslip",
      });
    }
  }

  const finalized = results.filter((r) => r.status !== "error");

  res.status(201).json({
    period: run.period,
    daysInMonth: run.daysInMonth,
    rows: results,
    summary: {
      ...sumRows(finalized),
      finalized: results.filter((r) => r.status === "finalized").length,
      replaced: results.filter((r) => r.status === "replaced").length,
      failed: results.filter((r) => r.status === "error").length,
    },
  });
});

/** Payslips of a period, narrowed to the requested employees. */
async function slipsForPeriod(body = {}) {
  const period = String(body.period ?? "").trim();
  if (!period) return { period, slips: [], employees: new Map(), settings: null };

  const filter = { period };
  const ids = Array.isArray(body.employeeIds) ? body.employeeIds.filter(Boolean) : null;
  if (ids && ids.length > 0) filter.employeeId = { $in: ids };

  const slips = await Payslip.find(filter).lean();
  const [employees, settings] = await Promise.all([
    Employee.find({ id: { $in: slips.map((s) => s.employeeId) } }).lean(),
    getSettings(),
  ]);

  return {
    period,
    slips,
    employees: new Map(employees.map((e) => [e.id, e])),
    settings,
  };
}

/**
 * POST /api/payroll/run/export-pdfs — write every payslip of a period to disk.
 *
 * A folder of PDFs beats a browser download per employee, and it avoids adding
 * a zip dependency to the packaged exe.
 */
router.post("/export-pdfs", async (req, res) => {
  const { period, slips, employees, settings } = await slipsForPeriod(req.body);
  if (!period) return res.status(400).json({ message: "period is required" });
  if (slips.length === 0) {
    return res
      .status(404)
      .json({ message: `No finalized payslips found for ${period}` });
  }

  // Downloads, matching where the Outlook attachment already lands. `recursive`
  // makes this a no-op when the folder is already there, so re-exporting a
  // period just overwrites that period's files instead of nesting a new folder.
  try {
    const outcome = await exportPayslipPdfs({
      slips,
      employees,
      settings,
      folder: req.body?.folder,
    });
    res.json({ period, ...outcome });
  } catch (err) {
    console.error("[Pay Run Export Error]:", err);
    res.status(500).json({ message: err.message || "Could not write the PDFs" });
  }
});

/**
 * POST /api/payroll/run/email — mail every payslip of a period.
 *
 * Sequential on purpose: Office 365 throttles bursts, and a per-row status list
 * is more useful to HR than one aggregate failure.
 */
router.post("/email", async (req, res) => {
  const { period, slips, employees, settings } = await slipsForPeriod(req.body);
  if (!period) return res.status(400).json({ message: "period is required" });
  if (slips.length === 0) {
    return res
      .status(404)
      .json({ message: `No finalized payslips found for ${period}` });
  }

  const rows = [];

  for (const payslip of slips) {
    const employee = employees.get(payslip.employeeId) ?? {};
    const outcome = await deliverPayslip({
      payslip,
      employee,
      settings,
      emailBody: req.body?.emailBody,
      // "auto": SMTP when a password is configured, desktop Outlook otherwise
      via: req.body?.via ?? "auto",
    });

    rows.push({
      employeeId: payslip.employeeId,
      employeeName: employee.name ?? payslip.employeeId,
      ...outcome,
    });
  }

  res.json({
    period,
    via: rows[0]?.via ?? "auto",
    rows,
    summary: {
      sent: rows.filter((r) => r.success).length,
      skipped: rows.filter((r) => !r.success && r.skipped).length,
      failed: rows.filter((r) => !r.success && !r.skipped).length,
    },
  });
});

export default router;
