import type { Employee, PayrollResult, CompanyProfile, SlipDefaults, ComputedComponent } from "@/shared/types";
import { inr } from "./format";
import { LOGO } from "./branding";

export function generateStyledPayslipHtml({
  emp,
  res,
  dim,
  dpay,
  period,
  company,
  slipDefaults,
}: {
  emp: Employee;
  res: PayrollResult;
  dim: number;
  dpay: number;
  period: string;
  company: CompanyProfile;
  slipDefaults: SlipDefaults;
}): string {
  const rowN = Math.max(res.earnings.length, res.deductions.length);
  const eRows: (ComputedComponent | null)[] = [...res.earnings];
  const dRows: (ComputedComponent | null)[] = [...res.deductions];
  while (eRows.length < rowN) eRows.push(null);
  while (dRows.length < rowN) dRows.push(null);

  const watermarkText =
    company.watermarkText !== undefined
      ? company.watermarkText
      : company.name || "COMM-IT";

  const companyLegal = company.legalName || "COMM-IT INDIA PVT. LTD.";
  const addressLines = company.addressLines?.length
    ? company.addressLines
    : [
        "S-113, First Floor, Salcon Aurum, Jasola District Centre",
        "Opposite Omax Square, New Delhi 110025",
      ];

  const logoSrc = company.logoUrl || LOGO;
  const footNoteText =
    slipDefaults?.footNote ||
    "This is a computer generated salary slip and does not require signature";

  const earningsRowsHtml = Array.from({ length: rowN })
    .map((_, i) => {
      const eName = eRows[i]?.name ?? "";
      const eAmt = eRows[i] ? inr(eRows[i]!.amount) : "";
      const dName = dRows[i]?.name ?? "";
      const dAmt = dRows[i] ? inr(dRows[i]!.amount) : "";

      return `
        <tr>
          <td style="text-align: left;">${eName}</td>
          <td style="text-align: right; font-family: monospace;">${eAmt}</td>
          <td style="text-align: left;">${dName}</td>
          <td style="text-align: right; font-family: monospace;">${dAmt}</td>
        </tr>
      `;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Payslip - ${emp.name} - ${period}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      color: #111;
      margin: 0;
      padding: 20px;
      background: #f4f5f7;
    }
    .paper-card {
      position: relative;
      max-width: 800px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #333333;
      padding: 24px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
    }
    .watermark-bg {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-30deg);
      font-size: 65px;
      font-weight: 900;
      color: #000000;
      opacity: 0.06;
      text-transform: uppercase;
      letter-spacing: 0.18em;
      white-space: nowrap;
      pointer-events: none;
      user-select: none;
      z-index: 1;
    }
    .content-wrap {
      position: relative;
      z-index: 2;
    }
    table.slip-grid {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #333333;
    }
    table.slip-grid td {
      border: 1px solid #333333;
      padding: 6px 10px;
      font-size: 12px;
      vertical-align: middle;
    }
    .logo-cell {
      width: 22%;
      text-align: center;
      padding: 10px;
    }
    .logo-img {
      max-height: 60px;
      max-width: 130px;
      height: auto;
      width: auto;
      object-contain: fit;
    }
    .company-title {
      font-size: 13.5px;
      font-weight: bold;
      display: block;
      margin-bottom: 2px;
    }
    .period-header {
      text-align: center;
      font-size: 13.5px;
      font-weight: bold;
      background-color: #f9fafb;
    }
    .components-banner {
      background-color: #e5e7eb;
      text-align: center;
      font-size: 13px;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .section-header td {
      background-color: #f9fafb;
      font-weight: bold;
      font-size: 12px;
    }
    .foot-note {
      margin-top: 12px;
      font-size: 11px;
      color: #333333;
    }
  </style>
</head>
<body>
  <div class="paper-card">
    ${watermarkText ? `<div class="watermark-bg">${watermarkText}</div>` : ""}

    <div class="content-wrap">
      <table class="slip-grid">
        <tbody>
          <!-- Header Row -->
          <tr>
            <td class="logo-cell" rowspan="2">
              <img src="${logoSrc}" alt="${company.name}" class="logo-img" />
            </td>
            <td colspan="3">
              <span class="company-title">${companyLegal}</span>
              ${addressLines.map((line) => `<span>${line}</span><br/>`).join("")}
            </td>
          </tr>
          <tr>
            <td colspan="3" class="period-header">
              Pay Slip - ${period}
            </td>
          </tr>

          <!-- Employee Details Grid -->
          <tr>
            <td style="width: 18%;">Employee Name</td>
            <td style="width: 32%; font-weight: bold;">${emp.name}</td>
            <td style="width: 18%;">Designation</td>
            <td style="width: 32%; font-weight: bold;">${emp.role}</td>
          </tr>
          <tr>
            <td>Employee Code</td>
            <td style="font-weight: bold;">${emp.id}</td>
            <td>Bank Name</td>
            <td style="font-weight: bold;">${emp.bankName || slipDefaults.bankName}</td>
          </tr>
          <tr>
            <td>Department</td>
            <td style="font-weight: bold;">${emp.dept}</td>
            <td>Bank Account No.</td>
            <td style="font-weight: bold;">${emp.bankAccountNo || slipDefaults.bankAccountNo}</td>
          </tr>
          <tr>
            <td>Days in Month</td>
            <td style="font-weight: bold;">${dim}</td>
            <td>PF Account No.</td>
            <td style="font-weight: bold;">${emp.pfAccountNo || slipDefaults.pfAccountNo}</td>
          </tr>
          <tr>
            <td>Days Payable</td>
            <td style="font-weight: bold;">${dpay}</td>
            <td></td>
            <td></td>
          </tr>

          <!-- Components Banner -->
          <tr>
            <td colspan="4" class="components-banner">COMPONENTS</td>
          </tr>
          <tr class="section-header">
            <td style="width: 30%;">Earnings</td>
            <td style="width: 20%; text-align: right;">Amount (In Rs.)</td>
            <td style="width: 30%;">Deductions</td>
            <td style="width: 20%; text-align: right;">Amount (In Rs.)</td>
          </tr>

          <!-- Salary Component Rows -->
          ${earningsRowsHtml}

          <!-- Totals Rows -->
          <tr>
            <td style="font-weight: bold;">Total Earnings (A)</td>
            <td style="text-align: right; font-family: monospace; font-weight: bold;">${inr(res.gross)}</td>
            <td style="background-color: #f9fafb;"></td>
            <td style="background-color: #f9fafb;"></td>
          </tr>
          <tr>
            <td style="background-color: #f9fafb;"></td>
            <td style="background-color: #f9fafb;"></td>
            <td style="font-weight: bold;">Total Deductions (B)</td>
            <td style="text-align: right; font-family: monospace; font-weight: bold;">${inr(res.totalDeductions)}</td>
          </tr>
          <tr>
            <td style="background-color: #f9fafb;"></td>
            <td style="background-color: #f9fafb;"></td>
            <td style="font-weight: 800; font-size: 13px;">Net Salary</td>
            <td style="text-align: right; font-family: monospace; font-weight: 800; font-size: 13px;">${inr(res.net)}</td>
          </tr>
        </tbody>
      </table>

      <div class="foot-note">${footNoteText}</div>
    </div>
  </div>
</body>
</html>`;
}
