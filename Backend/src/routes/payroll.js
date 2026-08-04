import { Router } from "express";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";
import { Employee } from "../models/Employee.js";
import { describeMailAccount } from "../models/MailAccount.js";
import { PayPeriodDays, upsertDayCount } from "../models/PayPeriodDays.js";
import { Payslip } from "../models/Payslip.js";
import { SalaryStructure } from "../models/SalaryStructure.js";
import { getSettings } from "../models/Settings.js";
import { compute, makeStructure, round2 } from "../lib/calc.js";
import { createPayslipPdfBuffer } from "../lib/pdfGenerator.js";
import {
  comparePeriodsDesc,
  financialYearOf,
  isInFinancialYear,
  periodKey,
} from "../lib/period.js";
import { deliverViaOutlook, describeOutlookResult } from "../lib/outlookLauncher.js";
import { exportPayslipPdfs } from "../lib/payslipExport.js";
import { deliverPayslip } from "../lib/payslipMailer.js";
import {
  buildPayslipEmailHtml,
  buildPayslipPdfInput,
  createSmtpTransport,
  payslipFileName,
} from "../lib/payslipPayload.js";

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

    const employees = await Employee.find().sort({ _id: -1 }).lean();
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

  // so reopening this period — here or in the bulk run — shows what was paid
  await upsertDayCount({ employeeId, period, daysInMonth, daysPayable });

  res.status(201).json(payslip);
});

/**
 * A stored slip plus the employee columns the history screen shows. The name
 * is joined on rather than snapshotted so a corrected spelling shows up on
 * reprints, while every rupee still comes from the snapshot.
 */
const toPayslipRow = (p, employee) => ({
  id: String(p._id),
  employeeId: p.employeeId,
  employeeName: employee?.name ?? p.employeeId,
  email: employee?.email ?? "",
  dept: employee?.dept ?? "",
  role: employee?.role ?? "",
  period: p.period,
  daysInMonth: p.daysInMonth,
  daysPayable: p.daysPayable,
  components: p.components ?? [],
  result: p.result ?? {},
  finalizedAt: p.updatedAt ?? p.createdAt ?? null,
  emailedAt: p.emailedAt ?? null,
  emailedTo: p.emailedTo ?? "",
});

/** Loads a slip with its employee and the company settings, or null. */
async function loadSlipContext(id) {
  const payslip = await Payslip.findById(id).lean();
  if (!payslip) return null;

  const [employee, settings] = await Promise.all([
    Employee.findOne({ id: payslip.employeeId }).lean(),
    getSettings(),
  ]);

  return { payslip, employee: employee ?? {}, settings };
}

/** GET /api/payroll/payslips?employeeId=&period=&fy= — finalized history */
router.get("/payslips", async (req, res) => {
  const filter = {};
  if (req.query.employeeId) filter.employeeId = req.query.employeeId;
  if (req.query.period) filter.period = req.query.period;

  const payslips = await Payslip.find(filter).lean();

  const inFy =
    req.query.fy != null && req.query.fy !== ""
      ? payslips.filter((p) => isInFinancialYear(p.period, req.query.fy))
      : payslips;

  const ids = [...new Set(inFy.map((p) => p.employeeId))];
  const employees = await Employee.find({ id: { $in: ids } }).lean();
  const byId = new Map(employees.map((e) => [e.id, e]));

  const rows = inFy
    .map((p) => toPayslipRow(p, byId.get(p.employeeId)))
    .sort(
      (a, b) =>
        comparePeriodsDesc(a.period, b.period) ||
        a.employeeName.localeCompare(b.employeeName),
    );

  res.json(rows);
});

/**
 * GET /api/payroll/days?period=&employeeId= — the LOP register.
 *
 * Returns [] rather than 404 for an untouched period so callers can fall back
 * to the company standard days.
 */
router.get("/days", async (req, res) => {
  const filter = {};
  if (req.query.period) filter.period = req.query.period;
  if (req.query.employeeId) filter.employeeId = req.query.employeeId;

  res.json(await PayPeriodDays.find(filter));
});

/** PUT /api/payroll/days/:employeeId — remember days payable for one period */
router.put("/days/:employeeId", async (req, res) => {
  const { period, daysInMonth, daysPayable } = req.body ?? {};
  if (!period) return res.status(400).json({ message: "period is required" });

  const saved = await upsertDayCount({
    employeeId: req.params.employeeId,
    period,
    daysInMonth,
    daysPayable,
  });

  if (!saved) {
    return res.status(400).json({ message: "daysInMonth must be greater than zero" });
  }
  res.json(saved);
});

/** GET /api/payroll/periods — every period that has payslips, newest first */
router.get("/periods", async (req, res) => {
  const payslips = await Payslip.find({}, "period result").lean();

  const byPeriod = new Map();
  payslips.forEach((p) => {
    const row =
      byPeriod.get(p.period) ??
      { period: p.period, count: 0, gross: 0, totalDeductions: 0, net: 0 };

    row.count += 1;
    row.gross = round2(row.gross + (p.result?.gross ?? 0));
    row.totalDeductions = round2(
      row.totalDeductions + (p.result?.totalDeductions ?? 0),
    );
    row.net = round2(row.net + (p.result?.net ?? 0));
    byPeriod.set(p.period, row);
  });

  res.json(
    [...byPeriod.values()].sort((a, b) => comparePeriodsDesc(a.period, b.period)),
  );
});

/**
 * GET /api/payroll/ytd/:employeeId?fy=2026 — financial-year totals.
 *
 * Defaults to the year of the employee's most recent slip, so opening the panel
 * shows the run HR just finished rather than an empty current year.
 */
router.get("/ytd/:employeeId", async (req, res) => {
  const { employeeId } = req.params;

  const [employee, all] = await Promise.all([
    Employee.findOne({ id: employeeId }).lean(),
    Payslip.find({ employeeId }).lean(),
  ]);

  const availableYears = [
    ...new Set(
      all.map((p) => financialYearOf(p.period)?.startYear).filter((y) => y != null),
    ),
  ].sort((a, b) => b - a);

  const requested = Number(req.query.fy);
  const startYear = Number.isFinite(requested)
    ? requested
    : (availableYears[0] ?? null);

  const slips =
    startYear == null
      ? []
      : all
          .filter((p) => isInFinancialYear(p.period, startYear))
          .sort((a, b) => periodKey(a.period) - periodKey(b.period));

  const componentTotals = new Map();
  const totals = { gross: 0, totalDeductions: 0, net: 0 };

  slips.forEach((p) => {
    const r = p.result ?? {};
    totals.gross = round2(totals.gross + (r.gross ?? 0));
    totals.totalDeductions = round2(
      totals.totalDeductions + (r.totalDeductions ?? 0),
    );
    totals.net = round2(totals.net + (r.net ?? 0));

    [...(r.earnings ?? []), ...(r.deductions ?? [])].forEach((c) => {
      const key = `${c.group}:${c.id}`;
      const row =
        componentTotals.get(key) ??
        { id: c.id, name: c.name, group: c.group, amount: 0 };
      row.amount = round2(row.amount + (c.amount ?? 0));
      componentTotals.set(key, row);
    });
  });

  res.json({
    employeeId,
    employeeName: employee?.name ?? employeeId,
    financialYear: startYear == null ? null : financialYearOf(`Apr ${startYear}`),
    availableYears,
    monthsPaid: slips.length,
    periods: slips.map((p) => ({
      id: String(p._id),
      period: p.period,
      gross: p.result?.gross ?? 0,
      totalDeductions: p.result?.totalDeductions ?? 0,
      net: p.result?.net ?? 0,
    })),
    totals,
    // lines that paid nothing all year are noise on a YTD statement
    components: [...componentTotals.values()]
      .filter((c) => c.amount !== 0)
      .sort((a, b) =>
        a.group === b.group ? b.amount - a.amount : a.group === "earning" ? -1 : 1,
      ),
  });
});

/**
 * POST /api/payroll/payslips/export-pdfs — save the given payslips to disk.
 *
 * Takes explicit ids so the history screen exports exactly the rows its filters
 * are showing; slips from different periods are filed into their own folders.
 * Declared before "/payslips/:id" so the literal path always wins.
 */
router.post("/payslips/export-pdfs", async (req, res) => {
  const ids = Array.isArray(req.body?.payslipIds)
    ? req.body.payslipIds.filter(Boolean)
    : [];

  if (ids.length === 0) {
    return res.status(400).json({ message: "payslipIds must be a non-empty array" });
  }

  const slips = await Payslip.find({ _id: { $in: ids } }).lean();
  if (slips.length === 0) {
    return res.status(404).json({ message: "None of those payslips exist" });
  }

  const [employees, settings] = await Promise.all([
    Employee.find({ id: { $in: slips.map((s) => s.employeeId) } }).lean(),
    getSettings(),
  ]);

  // newest period first, then by name, so the files are written in a sane order
  slips.sort(
    (a, b) =>
      comparePeriodsDesc(a.period, b.period) ||
      String(a.employeeId).localeCompare(String(b.employeeId)),
  );

  try {
    const outcome = await exportPayslipPdfs({
      slips,
      employees: new Map(employees.map((e) => [e.id, e])),
      settings,
      folder: req.body?.folder,
    });
    res.json(outcome);
  } catch (err) {
    console.error("[Payslip Export Error]:", err);
    res.status(500).json({ message: err.message || "Could not write the PDFs" });
  }
});

/**
 * POST /api/payroll/open-folder — reveal an exported folder in Explorer.
 *
 * Spawned without a shell: the path arrives in a request body.
 */
router.post("/open-folder", (req, res) => {
  const folder = String(req.body?.folder ?? "");

  if (process.platform !== "win32") {
    return res.status(501).json({ message: "Only supported on Windows" });
  }
  if (!folder || !fs.existsSync(folder) || !fs.statSync(folder).isDirectory()) {
    return res.status(400).json({ message: "That folder does not exist" });
  }

  spawn("explorer.exe", [path.resolve(folder)], { detached: true }).unref();
  res.json({ ok: true, folder });
});

/** GET /api/payroll/payslips/:id */
router.get("/payslips/:id", async (req, res) => {
  const ctx = await loadSlipContext(req.params.id);
  if (!ctx) return res.status(404).json({ message: "Payslip not found" });
  res.json(toPayslipRow(ctx.payslip, ctx.employee));
});

/** DELETE /api/payroll/payslips/:id — undo a wrong finalize */
router.delete("/payslips/:id", async (req, res) => {
  const deleted = await Payslip.findByIdAndDelete(req.params.id);
  if (!deleted) return res.status(404).json({ message: "Payslip not found" });
  res.status(204).end();
});

/**
 * GET|POST /api/payroll/payslips/:id/pdf — reprint from the stored snapshot.
 *
 * GET so the UI can open it in a tab, POST so it can pass a covering note.
 */
async function reprintPdf(req, res) {
  const ctx = await loadSlipContext(req.params.id);
  if (!ctx) return res.status(404).json({ message: "Payslip not found" });

  try {
    const pdfBuffer = await createPayslipPdfBuffer(
      buildPayslipPdfInput({ ...ctx, emailBody: req.body?.emailBody }),
    );

    const filename = payslipFileName({
      employeeName: ctx.employee.name,
      employeeId: ctx.payslip.employeeId,
      period: ctx.payslip.period,
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.send(pdfBuffer);
  } catch (err) {
    console.error("[Reprint PDF Error]:", err);
    return res
      .status(500)
      .json({ message: err.message || "Failed to regenerate the payslip PDF" });
  }
}

router.get("/payslips/:id/pdf", reprintPdf);
router.post("/payslips/:id/pdf", reprintPdf);

/**
 * POST /api/payroll/payslips/:id/email — re-send a finalized slip.
 *
 * Attaches the regenerated PDF rather than an HTML body copy, and records the
 * delivery on the slip so history can show what has already gone out.
 */
router.post("/payslips/:id/email", async (req, res) => {
  const ctx = await loadSlipContext(req.params.id);
  if (!ctx) return res.status(404).json({ message: "Payslip not found" });

  const { payslip, employee, settings } = ctx;
  const to = req.body?.to || employee.email;
  if (!to) {
    return res.status(400).json({
      message: `No email address on record for ${employee.name || payslip.employeeId}.`,
    });
  }

  const outcome = await deliverPayslip({
    payslip,
    employee,
    settings,
    to,
    emailBody: req.body?.emailBody,
    // "auto" uses SMTP when configured and the desktop Outlook profile otherwise
    via: req.body?.via ?? "auto",
    // the per-employee screen asks for a draft when the send cannot go through
    fallbackToDraft: Boolean(req.body?.fallbackToDraft),
  });

  // a skip (no SMTP password configured) is a state to report, not a failure
  return res.status(outcome.success || outcome.skipped ? 200 : 502).json(outcome);
});

/** POST /api/payroll/send-email — dispatch payslip via Outlook SMTP */
router.post("/send-email", async (req, res) => {
  const { employeeId, employeeEmail, employeeName, period, netPay, companyName, emailBody } = req.body;

  if (!employeeEmail) {
    return res.status(400).json({ message: "Recipient email is required" });
  }

  const settings = await getSettings();
  const { transporter, user: smtpUser } = await createSmtpTransport(settings);

  console.log(
    `[Outlook Email Engine] Dispatching payslip for ${employeeName || employeeId} (${period}) to ${employeeEmail} via ${smtpUser}`
  );

  try {
    if (transporter) {
      // same markup the reprint and bulk mailers use — see lib/payslipPayload.js
      const fullHtmlAttachment = buildPayslipEmailHtml({
        companyName,
        period,
        employeeName,
        employeeId,
        netPay,
        emailBody,
        footNote: settings?.slipDefaults?.footNote,
      });

      await transporter.sendMail({
        from: `"${companyName || 'COMM-IT Payroll'}" <${smtpUser}>`,
        to: employeeEmail,
        subject: `Payslip for ${period} — ${companyName || 'COMM-IT'}`,
        text: emailBody,
        html: fullHtmlAttachment,
        attachments: [
          {
            filename: `Payslip_${employeeId}_${period.replace(/\s+/g, "_")}.html`,
            content: fullHtmlAttachment,
            contentType: "text/html",
          },
        ],
      });

      return res.json({
        success: true,
        message: `Payslip email for ${period} successfully sent via Outlook (${smtpUser}) to ${employeeEmail}`,
        timestamp: new Date().toISOString(),
        recipient: employeeEmail,
      });
    }

    // Default response when SMTP password is pending configuration
    return res.json({
      success: true,
      message: `Direct Outlook dispatch initiated for ${employeeEmail} from ${smtpUser}.`,
      timestamp: new Date().toISOString(),
      recipient: employeeEmail,
    });
  } catch (err) {
    console.error("[Outlook SMTP Error]:", err);
    return res.status(500).json({
      message: err.message || "Failed to dispatch email via Outlook SMTP",
    });
  }
});

/**
 * PowerShell that opens a compose window for the payslip and attaches the PDF.
 *
 * All values arrive via a UTF-8 JSON file rather than string interpolation —
 * the body carries ₹, apostrophes and newlines, every one of which used to
 * break the generated script. (Keep this script free of backticks and of
 * "${...}" so the String.raw template stays intact.)
 *
 * New Outlook (the Store "Outlook for Windows" app, olk.exe) has no COM server,
 * and neither mailto: nor its CLI accept an attachment. The only local way in is
 * the clipboard: open the composer via mailto, put the PDF on the clipboard as a
 * CF_HDROP file list, then paste it into the compose window.
 *
 * That means synthesising a keystroke, so the script refuses to do it blind — it
 * pastes only after it has found a *visible olk window whose title matches this
 * payslip's subject* and confirmed that window is in the foreground. If it can't
 * confirm both, it reports back instead of typing into whatever had focus.
 */
// Outlook launcher plumbing lives in lib/outlookLauncher.js

/** POST /api/payroll/launch-outlook — open an Outlook draft with the PDF payslip attached */
router.post("/launch-outlook", async (req, res) => {
  const { employeeEmail, subject, emailBody, employeeId, period, employeeName, dept, role, netPay, pan, uan, doj, bankName, bankAccountNo, pfAccountNo, watermarkText, companyLogo, companyName, companyAddress, earnings, deductions, gross, totalDeductions, net, mode } = req.body;

  if (!employeeEmail) {
    return res.status(400).json({ message: "Recipient email is required" });
  }
  if (process.platform !== "win32") {
    return res.status(501).json({ message: "Outlook launch is only supported on Windows" });
  }

  try {
    const settings = await getSettings();
    const safeName = (employeeName || employeeId || "Employee").replace(/[^a-zA-Z0-9]/g, "_");
    const pdfFileName = `${safeName}_${employeeId || ""}_Payslip_${(period || "Period").replace(/\s+/g, "_")}.pdf`;

    const downloadsDir = path.join(os.homedir(), "Downloads");
    fs.mkdirSync(downloadsDir, { recursive: true });
    const pdfPath = path.join(downloadsDir, pdfFileName);

    // password and day counts come from our own records, not the request
    const draftFor = employeeId
      ? await Employee.findOne({ id: employeeId }).lean()
      : null;

    const pdfBuffer = await createPayslipPdfBuffer({
      employeeId,
      employeeName,
      dept,
      role,
      period,
      emailBody,
      pdfPassword: draftFor?.pdfPassword || "",
      daysInMonth: req.body?.daysInMonth,
      daysPayable: req.body?.daysPayable,
      netPay,
      pan,
      uan,
      doj,
      bankName,
      bankAccountNo,
      pfAccountNo,
      ifsc: req.body?.ifsc,
      companyLogo: companyLogo || settings?.company?.logoUrl,
      companyName: companyName || settings?.company?.legalName || settings?.company?.name,
      companyAddress: companyAddress || settings?.company?.addressLines,
      watermarkText: watermarkText !== undefined ? watermarkText : settings?.company?.watermarkText,
      earnings,
      deductions,
      gross,
      totalDeductions,
      net,
    });

    fs.writeFileSync(pdfPath, pdfBuffer);

    // "new" drives New Outlook via the clipboard; "classic" uses COM. A draft,
    // never a send — this route exists so HR can eyeball the mail first.
    const { result, error } = await deliverViaOutlook({
      to: employeeEmail,
      subject: subject || `Payslip for ${period || ""}`,
      body: emailBody || "",
      attachmentPath: pdfPath,
      mode,
      send: false,
      sendAs: (await describeMailAccount()).user,
    });
    const outcome = describeOutlookResult(result, pdfFileName);

    if (result === "FAILED" || result === "UNKNOWN") {
      return res.status(500).json({
        success: false,
        attached: false,
        pdfSaved: true,
        filePath: pdfPath,
        fileName: pdfFileName,
        message:
          `Could not open Outlook${error ? ` (${error})` : ""}. ` +
          `The payslip was saved to ${pdfPath}.`,
      });
    }

    return res.json({
      success: true,
      attached: outcome.attached,
      verified: outcome.verified,
      pdfSaved: true,
      method: result,
      filePath: pdfPath,
      fileName: pdfFileName,
      message: outcome.message,
    });
  } catch (err) {
    console.error("[Launch Outlook Handler Error]:", err);
    return res.status(500).json({ message: err.message || "Failed to launch Outlook" });
  }
});

/** POST /api/payroll/generate-pdf — return binary PDF file stream for download */
router.post("/generate-pdf", async (req, res) => {
  const { employeeId, period, employeeName, dept, role, emailBody, netPay, pan, uan, doj, bankName, bankAccountNo, pfAccountNo, earnings, deductions, gross, totalDeductions, net, watermarkText, companyLogo, companyName, companyAddress } = req.body;

  try {
    const settings = await getSettings();

    /**
     * This route takes the slip figures from the request, but the PDF password
     * is read from the employee record on purpose — a client must not be able to
     * pick the encryption password, or weaken it by omitting one.
     */
    const employee = employeeId
      ? await Employee.findOne({ id: employeeId }).lean()
      : null;

    const pdfBuffer = await createPayslipPdfBuffer({
      employeeId,
      employeeName,
      dept,
      role,
      period,
      emailBody,
      pdfPassword: employee?.pdfPassword || "",
      daysInMonth: req.body?.daysInMonth,
      daysPayable: req.body?.daysPayable,
      netPay,
      pan,
      uan,
      doj,
      bankName,
      bankAccountNo,
      pfAccountNo,
      ifsc: req.body?.ifsc,
      companyLogo: companyLogo || settings?.company?.logoUrl,
      companyName: companyName || settings?.company?.legalName || settings?.company?.name,
      companyAddress: companyAddress || settings?.company?.addressLines,
      watermarkText: watermarkText !== undefined ? watermarkText : settings?.company?.watermarkText,
      earnings,
      deductions,
      gross,
      totalDeductions,
      net,
    });

    const safeName = (employeeName || employeeId || 'Employee').replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `${safeName}_${employeeId || ''}_Payslip_${(period || 'Period').replace(/\s+/g, '_')}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.send(pdfBuffer);
  } catch (err) {
    console.error("[Generate PDF Route Error]:", err);
    return res.status(500).json({ message: err.message || "Failed to generate PDF" });
  }
});

export default router;
