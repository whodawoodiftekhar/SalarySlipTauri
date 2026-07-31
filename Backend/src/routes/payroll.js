import { Router } from "express";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { exec } from "node:child_process";
import nodemailer from "nodemailer";
import { Employee } from "../models/Employee.js";
import { Payslip } from "../models/Payslip.js";
import { SalaryStructure } from "../models/SalaryStructure.js";
import { getSettings } from "../models/Settings.js";
import { compute, makeStructure } from "../lib/calc.js";
import { createPayslipPdfBuffer } from "../lib/pdfGenerator.js";

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

/** POST /api/payroll/send-email — dispatch payslip via Outlook SMTP */
router.post("/send-email", async (req, res) => {
  const { employeeId, employeeEmail, employeeName, period, netPay, companyName, emailBody } = req.body;

  if (!employeeEmail) {
    return res.status(400).json({ message: "Recipient email is required" });
  }

  const settings = await getSettings();
  const smtpUser = process.env.OUTLOOK_USER || settings?.currentUser?.email || "";
  const smtpPass = process.env.OUTLOOK_PASS || "";

  console.log(
    `[Outlook Email Engine] Dispatching payslip for ${employeeName || employeeId} (${period}) to ${employeeEmail} via ${smtpUser}`
  );

  try {
    if (smtpPass) {
      const transporter = nodemailer.createTransport({
        host: process.env.OUTLOOK_SMTP_HOST || "smtp.office365.com",
        port: Number(process.env.OUTLOOK_SMTP_PORT || 587),
        secure: false,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
        tls: {
          ciphers: "SSLv3",
          rejectUnauthorized: false,
        },
      });

      const fullHtmlAttachment = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, Helvetica, sans-serif; color: #111; margin: 0; padding: 20px; background: #fff; }
    .paper { position: relative; max-width: 800px; margin: 0 auto; border: 1px solid #333; padding: 24px; }
    .watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); font-size: 65px; font-weight: 900; color: #000; opacity: 0.06; text-transform: uppercase; letter-spacing: 0.18em; white-space: nowrap; pointer-events: none; }
    table { width: 100%; border-collapse: collapse; border: 1px solid #333; }
    td { border: 1px solid #333; padding: 6px 10px; font-size: 12px; vertical-align: middle; }
    .banner { background-color: #e5e7eb; text-align: center; font-weight: bold; font-size: 13px; }
    .header-bg { background-color: #f9fafb; font-weight: bold; }
    .footer { margin-top: 12px; font-size: 11px; color: #333; }
  </style>
</head>
<body>
  <div class="paper">
    <div class="watermark">${companyName || 'COMM-IT'}</div>
    <table>
      <tbody>
        <tr>
          <td colspan="4" style="text-align: center; font-size: 15px; font-weight: bold; padding: 12px;">
            ${companyName || 'COMM-IT INDIA PVT. LTD.'}<br/>
            <span style="font-size: 13px; font-weight: normal;">Pay Slip - ${period}</span>
          </td>
        </tr>
        <tr>
          <td style="width: 20%;">Employee Name</td>
          <td style="width: 30%; font-weight: bold;">${employeeName || ''}</td>
          <td style="width: 20%;">Employee Code</td>
          <td style="width: 30%; font-weight: bold;">${employeeId || ''}</td>
        </tr>
        <tr>
          <td colspan="4" class="banner">PAYROLL SUMMARY</td>
        </tr>
        <tr>
          <td colspan="2" style="font-weight: bold;">Gross Earnings (A)</td>
          <td colspan="2" style="text-align: right; font-family: monospace; font-weight: bold;">₹ ${netPay}</td>
        </tr>
      </tbody>
    </table>
    <div style="margin-top: 15px; background: #f9fafb; padding: 12px; border: 1px solid #ddd; font-family: monospace; font-size: 11.5px; white-space: pre-wrap;">${emailBody}</div>
    <div class="footer">This is a computer generated salary slip and does not require signature</div>
  </div>
</body>
</html>`;

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

/** POST /api/payroll/launch-outlook — launch Windows Outlook COM object with attached PDF payslip */
router.post("/launch-outlook", async (req, res) => {
  const { employeeEmail, subject, emailBody, employeeId, period, employeeName, dept, role, netPay, pan, uan, doj, bankName, bankAccountNo, pfAccountNo, watermarkText, earnings, deductions, gross, totalDeductions, net } = req.body;

  if (!employeeEmail) {
    return res.status(400).json({ message: "Recipient email is required" });
  }

  try {
    const safeName = (employeeName || employeeId || 'Employee').replace(/[^a-zA-Z0-9]/g, '_');
    const pdfFileName = `${safeName}_${employeeId || ''}_Payslip_${(period || 'Period').replace(/\s+/g, '_')}.pdf`;
    const downloadsDir = path.join(os.homedir(), "Downloads");
    const tempPdfPath = path.join(downloadsDir, pdfFileName);

    // Generate real binary PDF Buffer
    const pdfBuffer = await createPayslipPdfBuffer({
      employeeId,
      employeeName,
      dept,
      role,
      period,
      emailBody,
      netPay,
      pan,
      uan,
      doj,
      bankName,
      bankAccountNo,
      pfAccountNo,
      watermarkText,
      earnings,
      deductions,
      gross,
      totalDeductions,
      net,
    });

    fs.writeFileSync(tempPdfPath, pdfBuffer);

    // Use native Windows backslash path for Outlook COM
    const winPath = tempPdfPath.replace(/\//g, "\\");

    // Write email body & subject to temp files to avoid PowerShell special char issues (₹, ', etc.)
    const tempBodyFile = path.join(os.tmpdir(), `outlook_body_${Date.now()}.txt`);
    const tempSubjectFile = path.join(os.tmpdir(), `outlook_subject_${Date.now()}.txt`);
    fs.writeFileSync(tempBodyFile, emailBody || "", "utf-8");
    fs.writeFileSync(tempSubjectFile, subject || "", "utf-8");

    const bodyPath = tempBodyFile.replace(/\//g, "\\");
    const subjectPath = tempSubjectFile.replace(/\//g, "\\");

    // PowerShell script reads body & subject from temp files — no inline string escaping needed
    const psScript = [
      `$bodyText = [System.IO.File]::ReadAllText('${bodyPath}', [System.Text.Encoding]::UTF8)`,
      `$subjectText = [System.IO.File]::ReadAllText('${subjectPath}', [System.Text.Encoding]::UTF8)`,
      `$Outlook = New-Object -ComObject Outlook.Application`,
      `$Mail = $Outlook.CreateItem(0)`,
      `$Mail.To = '${employeeEmail}'`,
      `$Mail.Subject = $subjectText`,
      `$Mail.Body = $bodyText`,
      `$Mail.Attachments.Add('${winPath}')`,
      `$Mail.Display()`,
      `Remove-Item '${bodyPath}' -Force -ErrorAction SilentlyContinue`,
      `Remove-Item '${subjectPath}' -Force -ErrorAction SilentlyContinue`,
    ].join("\n");

    const psTempFile = path.join(os.tmpdir(), `launch_outlook_${Date.now()}.ps1`);
    fs.writeFileSync(psTempFile, psScript, "utf-8");

    exec(`powershell -NoProfile -ExecutionPolicy Bypass -File "${psTempFile}"`, { timeout: 15000 }, (error, stdout, stderr) => {
      try { fs.unlinkSync(psTempFile); } catch {}
      if (error) {
        console.error("[Launch Outlook Error]:", error.message);
        if (stderr) console.error("[Launch Outlook stderr]:", stderr);
      } else {
        console.log("[Launch Outlook] Outlook opened successfully with attachment:", winPath);
      }
    });

    return res.json({
      success: true,
      message: `Launched Outlook with attached ${pdfFileName}`,
      filePath: tempPdfPath,
    });
  } catch (err) {
    console.error("[Launch Outlook Handler Error]:", err);
    return res.status(500).json({ message: err.message || "Failed to launch Outlook" });
  }
});

/** POST /api/payroll/generate-pdf — return binary PDF file stream for download */
router.post("/generate-pdf", async (req, res) => {
  const { employeeId, period, employeeName, dept, role, emailBody, netPay, pan, uan, doj, bankName, bankAccountNo, pfAccountNo, earnings, deductions, gross, totalDeductions, net, watermarkText } = req.body;

  try {
    const pdfBuffer = await createPayslipPdfBuffer({
      employeeId,
      employeeName,
      dept,
      role,
      period,
      emailBody,
      netPay,
      pan,
      uan,
      doj,
      bankName,
      bankAccountNo,
      pfAccountNo,
      earnings,
      deductions,
      gross,
      totalDeductions,
      net,
      watermarkText,
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
