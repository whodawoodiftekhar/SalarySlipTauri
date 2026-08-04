/**
 * Turns a stored payslip back into the shapes the PDF writer and the mailer
 * want.
 *
 * A reprint has to come from the snapshot the slip was finalized with, never
 * from the employee's current structure — otherwise last quarter's payslip
 * would silently change after a salary revision. Everything here reads from
 * `payslip.components` / `payslip.result` for exactly that reason.
 */
import nodemailer from "nodemailer";

const money = (n) =>
  Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/** The download name convention already used by generate-pdf/launch-outlook. */
export function payslipFileName({ employeeName, employeeId, period }, ext = "pdf") {
  const safeName = (employeeName || employeeId || "Employee").replace(
    /[^a-zA-Z0-9]/g,
    "_",
  );
  return `${safeName}_${employeeId || ""}_Payslip_${(period || "Period").replace(
    /\s+/g,
    "_",
  )}.${ext}`;
}

/** Arguments for createPayslipPdfBuffer, assembled from stored data. */
export function buildPayslipPdfInput({ payslip, employee = {}, settings = {}, emailBody }) {
  const result = payslip.result ?? {};
  const company = settings.company ?? {};
  const slipDefaults = settings.slipDefaults ?? {};

  return {
    employeeId: payslip.employeeId,
    employeeName: employee.name || payslip.employeeId,
    dept: employee.dept || "",
    role: employee.role || "",
    period: payslip.period,
    emailBody: emailBody ?? "",
    netPay: money(result.net),
    pan: employee.pan || "",
    uan: employee.uan || "",
    doj: employee.doj || "",
    bankName: employee.bankName || slipDefaults.bankName || "",
    bankAccountNo: employee.bankAccountNo || slipDefaults.bankAccountNo || "",
    pfAccountNo: employee.pfAccountNo || slipDefaults.pfAccountNo || "",
    ifsc: employee.ifsc || "",
    companyLogo: company.logoUrl,
    companyName: company.legalName || company.name,
    companyAddress: company.addressLines,
    watermarkText: company.watermarkText,
    earnings: result.earnings ?? [],
    deductions: result.deductions ?? [],
    gross: result.gross ?? 0,
    totalDeductions: result.totalDeductions ?? 0,
    net: result.net ?? 0,
  };
}

/**
 * The payslip covering note.
 *
 * Deliberately identical to the draft the per-employee "Send via Outlook" modal
 * shows (SalarySlip/src/features/payroll/components/SendOutlookEmailModal.tsx),
 * so an automated send and a hand-reviewed draft read exactly the same. The
 * "Note:" line must stay a line of its own — the Outlook HTML formatter keys on
 * that prefix to colour it red.
 */
export function payslipEmailBody({ employeeName, period, companyName, footNote }) {
  return `Dear ${employeeName || "Employee"},

Please find the attached salary slip for the month of ${period}.

Note: ${footNote || "This is a computer generated salary slip and does not require signature."}

Best regards,
Human Resourse
${companyName || "COMM-IT INDIA PVT. LTD."}
`;
}

/** @deprecated kept as an alias while callers migrate to payslipEmailBody */
export const defaultEmailBody = payslipEmailBody;

/**
 * Recipient, subject and body for one payslip mail.
 *
 * Single source for all three delivery paths — SMTP, a direct Outlook send and
 * the draft fallback — so the same mail is composed no matter which one runs.
 */
export function payslipMessage({ payslip, employee = {}, settings = {}, to, emailBody }) {
  const companyName = settings?.company?.legalName || settings?.company?.name;

  return {
    companyName,
    recipient: to || employee?.email || "",
    subject: `Payslip for ${payslip.period} — ${companyName || "COMM-IT"}`,
    body:
      emailBody ||
      payslipEmailBody({
        employeeName: employee?.name,
        period: payslip.period,
        companyName,
        footNote: settings?.slipDefaults?.footNote,
      }),
  };
}

const componentRows = (earnings = [], deductions = []) => {
  const rowN = Math.max(earnings.length, deductions.length);
  const cells = [];

  for (let i = 0; i < rowN; i += 1) {
    const e = earnings[i];
    const d = deductions[i];
    cells.push(`
        <tr>
          <td>${e?.name ?? ""}</td>
          <td style="text-align: right; font-family: monospace;">${e ? money(e.amount) : ""}</td>
          <td>${d?.name ?? ""}</td>
          <td style="text-align: right; font-family: monospace;">${d ? money(d.amount) : ""}</td>
        </tr>`);
  }

  return cells.join("");
};

/**
 * The payslip email body. Kept byte-identical to what send-email has always
 * produced when no breakdown is passed; the bulk and reprint routes pass
 * `earnings`/`deductions` and get a full component table instead of the single
 * summary row.
 */
export function buildPayslipEmailHtml({
  companyName,
  period,
  employeeName,
  employeeId,
  netPay,
  emailBody,
  earnings,
  deductions,
  gross,
  totalDeductions,
  net,
  footNote,
}) {
  const hasBreakdown =
    (Array.isArray(earnings) && earnings.length > 0) ||
    (Array.isArray(deductions) && deductions.length > 0);

  const summary = hasBreakdown
    ? `
        <tr class="header-bg">
          <td>Earnings</td>
          <td style="text-align: right;">Amount (In Rs.)</td>
          <td>Deductions</td>
          <td style="text-align: right;">Amount (In Rs.)</td>
        </tr>${componentRows(earnings, deductions)}
        <tr class="header-bg">
          <td>Gross Earnings (A)</td>
          <td style="text-align: right; font-family: monospace;">${money(gross)}</td>
          <td>Total Deductions (B)</td>
          <td style="text-align: right; font-family: monospace;">${money(totalDeductions)}</td>
        </tr>
        <tr>
          <td colspan="2" style="font-weight: bold;">Net Pay (A - B)</td>
          <td colspan="2" style="text-align: right; font-family: monospace; font-weight: bold;">₹ ${money(net)}</td>
        </tr>`
    : `
        <tr>
          <td colspan="2" style="font-weight: bold;">Gross Earnings (A)</td>
          <td colspan="2" style="text-align: right; font-family: monospace; font-weight: bold;">₹ ${netPay}</td>
        </tr>`;

  return `<!DOCTYPE html>
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
        </tr>${summary}
      </tbody>
    </table>
    <div style="margin-top: 15px; background: #f9fafb; padding: 12px; border: 1px solid #ddd; font-family: sans-serif; font-size: 12px; white-space: pre-wrap;">${emailBody ?? ''}</div>
    <div class="footer" style="margin-top: 12px; font-size: 10px; color: #dc2626; font-weight: bold;">Note: ${footNote || 'This is a computer generated salary slip and does not require signature'}</div>
  </div>
</body>
</html>`;
}

/**
 * SMTP sender, or null when no password is configured.
 *
 * The app ships without credentials and HR is expected to use the Outlook COM
 * path instead, so callers must treat null as "not an error" and report the
 * skip rather than failing the run.
 */
export function createSmtpTransport(settings = {}) {
  const user = process.env.OUTLOOK_USER || settings?.currentUser?.email || "";
  const pass = process.env.OUTLOOK_PASS || "";
  if (!pass) return { transporter: null, user };

  const transporter = nodemailer.createTransport({
    host: process.env.OUTLOOK_SMTP_HOST || "smtp.office365.com",
    port: Number(process.env.OUTLOOK_SMTP_PORT || 587),
    secure: false,
    auth: { user, pass },
    tls: { ciphers: "SSLv3", rejectUnauthorized: false },
  });

  return { transporter, user };
}
