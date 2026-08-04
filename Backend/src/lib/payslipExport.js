/**
 * Writes payslip PDFs to disk, one folder per pay period.
 *
 * Shared by the pay run (which exports a whole period) and the payslip history
 * screen (which exports whatever the filters are showing, possibly spanning
 * several periods). Files land under Downloads because that is where the
 * Outlook attachment path already writes; the folder is created only when it is
 * missing, so re-exporting a period overwrites those files instead of nesting a
 * second folder.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createPayslipPdfBuffer } from "./pdfGenerator.js";
import { buildPayslipPdfInput, payslipFileName } from "./payslipPayload.js";

export const defaultExportRoot = () =>
  path.join(os.homedir(), "Downloads", "SalarySlip Payslips");

/** Where a period's PDFs belong. */
export const payslipFolderFor = (period, folder) =>
  path.join(
    folder || defaultExportRoot(),
    String(period ?? "Period").replace(/\s+/g, "_"),
  );

/**
 * Writes one payslip PDF into its period folder and returns where it landed.
 *
 * Used by the bulk export *and* by both mailers, so a payslip that gets emailed
 * is left in the same folder — and is the very same file — as one that was only
 * exported. The folder is created only when missing; an existing one is reused
 * and its file overwritten.
 */
export async function writePayslipPdf({ payslip, employee = {}, settings, folder }) {
  const dir = payslipFolderFor(payslip.period, folder);
  const created = !fs.existsSync(dir);
  if (created) fs.mkdirSync(dir, { recursive: true });

  const fileName = payslipFileName({
    employeeName: employee.name,
    employeeId: payslip.employeeId,
    period: payslip.period,
  });
  const filePath = path.join(dir, fileName);

  // emailBody is deliberately not passed: the PDF writer ignores it, so the
  // exported file and the emailed attachment stay byte-identical
  const pdfBuffer = await createPayslipPdfBuffer(
    buildPayslipPdfInput({ payslip, employee, settings }),
  );
  fs.writeFileSync(filePath, pdfBuffer);

  return { filePath, fileName, folder: dir, created };
}

/**
 * @param slips     stored payslip documents
 * @param employees Map of employeeId -> employee, for names and bank details
 * @param folder    optional root; each period still gets its own subfolder
 * @returns {Promise<{folder: string, folders: string[], created: boolean,
 *   saved: object[], failed: object[]}>} `folder` is the single period folder
 *   when everything landed in one place, otherwise the shared root.
 */
export async function exportPayslipPdfs({ slips, employees, settings, folder }) {
  const root = folder || defaultExportRoot();
  const saved = [];
  const failed = [];
  const touched = new Set();
  let created = false;

  for (const payslip of slips) {
    const employee = employees.get(payslip.employeeId) ?? {};

    try {
      const written = await writePayslipPdf({ payslip, employee, settings, folder: root });
      if (written.created) created = true;
      touched.add(written.folder);

      saved.push({
        employeeId: payslip.employeeId,
        period: payslip.period,
        fileName: written.fileName,
        folder: written.folder,
      });
    } catch (err) {
      console.error(`[Payslip Export] ${payslip.employeeId} failed:`, err);
      failed.push({
        employeeId: payslip.employeeId,
        employeeName: employee.name ?? payslip.employeeId,
        message: err.message || "Could not write this PDF",
      });
    }
  }

  const folders = [...touched];

  return {
    folder: folders.length === 1 ? folders[0] : root,
    folders,
    created,
    saved,
    failed,
  };
}
