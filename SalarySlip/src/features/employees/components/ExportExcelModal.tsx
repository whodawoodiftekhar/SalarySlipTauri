import ExcelJS from "exceljs";
import { Calendar, Download, FileSpreadsheet, X } from "lucide-react";
import { useState } from "react";
import { useCatalog } from "@/features/catalog/hooks/useCatalog";
import { useSettings } from "@/features/settings/hooks/useSettings";
import { Button, IconButton } from "@/shared/components/ui/Button";
import { Field, FIELD_INPUT } from "@/shared/components/ui/Field";
import { Overlay } from "@/shared/components/ui/Overlay";
import { inr0 } from "@/shared/lib/format";
import type { RosterEntry } from "@/shared/types";

// Dynamically generated 12 short month names using Intl calendar
const MONTHS = Array.from({ length: 12 }, (_, i) =>
  new Date(2000, i, 1).toLocaleString("en-US", { month: "short" })
);

// Dynamically generated year list relative to current system year
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 11 }, (_, i) => String(currentYear - 5 + i));

function getColLetter(colIdx: number): string {
  let letter = "";
  let temp = colIdx;
  while (temp > 0) {
    const mod = (temp - 1) % 26;
    letter = String.fromCharCode(65 + mod) + letter;
    temp = Math.floor((temp - 1) / 26);
  }
  return letter;
}

export function ExportExcelModal({
  roster,
  onClose,
}: {
  roster: RosterEntry[];
  onClose: () => void;
}) {
  const { departments, company } = useSettings();
  const { items: catalogItems } = useCatalog();

  const [fromMonth, setFromMonth] = useState("Jan");
  const [fromYear, setFromYear] = useState(String(currentYear));
  const [toMonth, setToMonth] = useState(MONTHS[new Date().getMonth()] ?? "Jul");
  const [toYear, setToYear] = useState(String(currentYear));
  const [selectedDept, setSelectedDept] = useState("All");

  const depts = ["All", ...Array.from(new Set([...departments, ...roster.map((e) => e.dept)]))];

  // Filter roster by selected department
  const filteredRoster = roster.filter((e) =>
    selectedDept === "All" ? true : e.dept === selectedDept
  );

  const fromPeriod = `${fromMonth} ${fromYear}`;
  const toPeriod = `${toMonth} ${toYear}`;

  const totalGross = filteredRoster.reduce((s, e) => s + e.gross, 0);
  const totalNet = filteredRoster.reduce((s, e) => s + e.net, 0);

  /** Build dynamic lists of earnings and deductions across catalog and roster */
  const buildComponentLists = () => {
    const earningsMap = new Map<string, string>();
    const deductionsMap = new Map<string, string>();

    // Preferred default order
    const defaultEarnings = [
      { id: "basic", name: "Basic Salary" },
      { id: "hra", name: "HRA" },
      { id: "transport", name: "Transport Allowance" },
      { id: "special", name: "Special Allowance" },
      { id: "medical", name: "Medical Reimbursement" },
      { id: "onsite", name: "Onsite Incentive" },
    ];

    const defaultDeductions = [
      { id: "pf", name: "PF Deduction" },
      { id: "pt", name: "Professional Tax" },
      { id: "tds", name: "TDS Tax" },
    ];

    defaultEarnings.forEach((item) => earningsMap.set(item.id.toLowerCase(), item.name));
    defaultDeductions.forEach((item) => deductionsMap.set(item.id.toLowerCase(), item.name));

    // Include components from db catalog
    (catalogItems || []).forEach((item) => {
      const codeKey = (item.code || "").toLowerCase();
      const nameKey = (item.name || "").toLowerCase();
      if (item.group === "earning") {
        if (!earningsMap.has(codeKey) && !earningsMap.has(nameKey)) {
          earningsMap.set(codeKey, item.name);
        }
      } else {
        if (!deductionsMap.has(codeKey) && !deductionsMap.has(nameKey)) {
          deductionsMap.set(codeKey, item.name);
        }
      }
    });

    // Include any dynamic components present on roster entries
    roster.forEach((e) => {
      (e.earnings || []).forEach((c) => {
        const idKey = (c.id || c.name || "").toLowerCase();
        if (!Array.from(earningsMap.keys()).some((k) => k === idKey || earningsMap.get(k)?.toLowerCase() === c.name.toLowerCase())) {
          earningsMap.set(idKey, c.name);
        }
      });
      (e.deductions || []).forEach((c) => {
        const idKey = (c.id || c.name || "").toLowerCase();
        if (!Array.from(deductionsMap.keys()).some((k) => k === idKey || deductionsMap.get(k)?.toLowerCase() === c.name.toLowerCase())) {
          deductionsMap.set(idKey, c.name);
        }
      });
    });

    return {
      earningsList: Array.from(earningsMap.entries()).map(([id, name]) => ({ id, name })),
      deductionsList: Array.from(deductionsMap.entries()).map(([id, name]) => ({ id, name })),
    };
  };

  const getCompAmount = (
    components: { id: string; name: string; amount: number }[] | undefined,
    targetId: string,
    targetName: string,
    fallbackVal?: number,
  ): number => {
    if (components && components.length > 0) {
      const found = components.find(
        (c) =>
          (c.id && c.id.toLowerCase() === targetId.toLowerCase()) ||
          (c.name && c.name.toLowerCase() === targetName.toLowerCase()),
      );
      if (found !== undefined && found.amount !== undefined) {
        return found.amount;
      }
    }
    return fallbackVal ?? 0;
  };

  /**
   * Generates a 100% styled native XLSX workbook using ExcelJS:
   * - Dynamically includes ALL earnings and deductions components!
   * - Merged Title Header Banner
   * - Brand Navy Blue & Royal Blue Fills
   * - Auto-fit column widths
   * - String formatting for Bank/PF account numbers
   */
  const handleExportStyledExcel = async () => {
    const { earningsList, deductionsList } = buildComponentLists();

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "COMM-IT Payroll Engine";
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet("Salary Details");

    const headerTitles = [
      "Employee Code",
      "Employee Name",
      "Department",
      "Designation",
      "Bank Name",
      "Bank Account No",
      "PF Account No",
      ...earningsList.map((item) => `${item.name} (₹)`),
      "Gross Salary (₹)",
      ...deductionsList.map((item) => `${item.name} (₹)`),
      "Total Deductions (₹)",
      "Net Take-Home Salary (₹)",
      "Export Date Range",
    ];

    const lastColLetter = getColLetter(headerTitles.length);

    // 1. Configure Auto-Fit Column Widths
    worksheet.columns = headerTitles.map((title) => ({
      width: Math.max(16, title.length + 4),
    }));

    // 2. Row 1: COMM-IT Company Header Banner
    worksheet.mergeCells(`A1:${lastColLetter}1`);
    const titleCell = worksheet.getCell("A1");
    titleCell.value = "COMM-IT INDIA PVT. LTD.";
    titleCell.font = { name: "Segoe UI", size: 16, bold: true, color: { argb: "FFFFFFFF" } };
    titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F2537" } };
    titleCell.alignment = { vertical: "middle", horizontal: "center" };
    worksheet.getRow(1).height = 42;

    // 3. Row 2: Subheader
    worksheet.mergeCells(`A2:${lastColLetter}2`);
    const subTitleCell = worksheet.getCell("A2");
    subTitleCell.value = "EMPLOYEE SALARY & PAYROLL DETAILS REPORT";
    subTitleCell.font = { name: "Segoe UI", size: 12, bold: true, color: { argb: "FF93C5FD" } };
    subTitleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A8A" } };
    subTitleCell.alignment = { vertical: "middle", horizontal: "center" };
    worksheet.getRow(2).height = 28;

    // 4. Row 3: Filter Metadata Bar
    worksheet.mergeCells(`A3:${lastColLetter}3`);
    const metaCell = worksheet.getCell("A3");
    metaCell.value = `Date Range: ${fromPeriod} to ${toPeriod}   |   Department: ${selectedDept}   |   Total Net Payout: ₹${inr0(totalNet)}`;
    metaCell.font = { name: "Segoe UI", size: 10.5, bold: true, color: { argb: "FF334155" } };
    metaCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
    metaCell.alignment = { vertical: "middle", horizontal: "center" };
    worksheet.getRow(3).height = 26;

    // Row 4: Blank Separator
    worksheet.getRow(4).height = 10;

    // 5. Row 5: Column Headers
    const headerRow = worksheet.getRow(5);
    headerRow.height = 32;

    const grossColIdx = 7 + earningsList.length;
    const netColIdx = headerTitles.length - 2;

    headerTitles.forEach((title, colIdx) => {
      const cell = headerRow.getCell(colIdx + 1);
      cell.value = title;
      cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F2537" } };
      cell.alignment = {
        vertical: "middle",
        horizontal: colIdx >= 7 && colIdx <= headerTitles.length - 2 ? "right" : "center",
      };
      cell.border = {
        top: { style: "thin", color: { argb: "FF1E293B" } },
        left: { style: "thin", color: { argb: "FF1E293B" } },
        bottom: { style: "medium", color: { argb: "FF0F2537" } },
        right: { style: "thin", color: { argb: "FF1E293B" } },
      };
    });

    // 6. Data Rows
    filteredRoster.forEach((e, rIdx) => {
      const earningVals = earningsList.map((item) =>
        getCompAmount(e.earnings, item.id, item.name, (e as any)[item.id]),
      );
      const deductionVals = deductionsList.map((item) =>
        getCompAmount(e.deductions, item.id, item.name, (e as any)[item.id]),
      );

      const rowValues = [
        String(e.id),
        e.name,
        e.dept,
        e.role,
        e.bankName || "-",
        String(e.bankAccountNo || "-"),
        String(e.pfAccountNo || "-"),
        ...earningVals,
        e.gross,
        ...deductionVals,
        e.totalDeductions,
        e.net,
        `${fromPeriod} to ${toPeriod}`,
      ];

      const rowNum = 6 + rIdx;
      const row = worksheet.getRow(rowNum);
      row.height = 24;
      const isEven = rIdx % 2 === 0;
      const bgHex = isEven ? "FFFFFFFF" : "FFF8FAFC";

      rowValues.forEach((val, colIdx) => {
        const cell = row.getCell(colIdx + 1);
        cell.value = val;
        cell.font = { name: "Segoe UI", size: 9.5, color: { argb: "FF1E293B" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgHex } };

        if (colIdx >= 7 && colIdx <= headerTitles.length - 2) {
          cell.alignment = { vertical: "middle", horizontal: "right" };
          cell.numFmt = "₹#,##0.00";
        } else if (colIdx === 0 || colIdx === headerTitles.length - 1) {
          cell.alignment = { vertical: "middle", horizontal: "center" };
        } else {
          cell.alignment = { vertical: "middle", horizontal: "left" };
        }

        if (colIdx === 0) cell.font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: "FF0F2537" } };
        if (colIdx === grossColIdx || colIdx === netColIdx) {
          cell.font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: "FF0F2537" } };
        }

        cell.border = {
          top: { style: "thin", color: { argb: "FFE2E8F0" } },
          left: { style: "thin", color: { argb: "FFE2E8F0" } },
          bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
          right: { style: "thin", color: { argb: "FFE2E8F0" } },
        };
      });
    });

    // 7. Totals Summary Row at Bottom
    const summaryRowNum = 6 + filteredRoster.length;
    worksheet.mergeCells(`A${summaryRowNum}:G${summaryRowNum}`);
    const summaryCell = worksheet.getCell(`A${summaryRowNum}`);
    summaryCell.value = `TOTAL SUMMARY (${filteredRoster.length} Employees)`;
    summaryCell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    summaryCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F2537" } };
    summaryCell.alignment = { vertical: "middle", horizontal: "center" };

    const summaryRow = worksheet.getRow(summaryRowNum);
    summaryRow.height = 28;

    const totalDeductColIdx = 8 + earningsList.length + deductionsList.length; // 0-indexed: 8 + e + d
    const dateColIdx = headerTitles.length; // 1-indexed: last column

    for (let c = 8; c <= headerTitles.length; c++) {
      const cell = summaryRow.getCell(c);
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };
      cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FF0F2537" } };
      cell.alignment = { vertical: "middle", horizontal: "right" };
      cell.border = {
        top: { style: "medium", color: { argb: "FF0F2537" } },
        bottom: { style: "double", color: { argb: "FF0F2537" } },
      };

      if (c === grossColIdx + 1) {
        cell.value = totalGross;
        cell.numFmt = "₹#,##0.00";
      } else if (c === netColIdx + 1) {
        cell.value = totalNet;
        cell.numFmt = "₹#,##0.00";
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F2537" } };
        cell.font = { name: "Segoe UI", size: 10.5, bold: true, color: { argb: "FFFFFFFF" } };
      } else if (c === totalDeductColIdx + 1) {
        const totalDeductionsSum = filteredRoster.reduce((s, e) => s + e.totalDeductions, 0);
        cell.value = totalDeductionsSum;
        cell.numFmt = "₹#,##0.00";
      } else if (c === dateColIdx) {
        cell.value = `${fromPeriod} - ${toPeriod}`;
        cell.alignment = { vertical: "middle", horizontal: "center" };
      } else {
        // Dynamic column sum for individual earnings and deductions
        const colIdxZeroBased = c - 1;
        if (colIdxZeroBased >= 7 && colIdxZeroBased < grossColIdx) {
          const earningIdx = colIdxZeroBased - 7;
          const target = earningsList[earningIdx];
          const sum = filteredRoster.reduce((s, e) => s + getCompAmount(e.earnings, target.id, target.name, (e as any)[target.id]), 0);
          cell.value = sum;
          cell.numFmt = "₹#,##0.00";
        } else if (colIdxZeroBased > grossColIdx && colIdxZeroBased < totalDeductColIdx) {
          const deductIdx = colIdxZeroBased - (grossColIdx + 1);
          const target = deductionsList[deductIdx];
          const sum = filteredRoster.reduce((s, e) => s + getCompAmount(e.deductions, target.id, target.name, (e as any)[target.id]), 0);
          cell.value = sum;
          cell.numFmt = "₹#,##0.00";
        } else {
          cell.value = "-";
        }
      }
    }

    // Generate binary XLSX buffer and trigger download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `${company.name.replace(/\s+/g, "_")}_Salary_Details_${fromMonth}${fromYear}_to_${toMonth}${toYear}.xlsx`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onClose();
  };

  const handleExportCSV = () => {
    const { earningsList, deductionsList } = buildComponentLists();

    const headers = [
      "Employee Code",
      "Employee Name",
      "Department",
      "Designation",
      "Bank Name",
      "Bank Account No",
      "PF Account No",
      ...earningsList.map((item) => item.name),
      "Gross Salary",
      ...deductionsList.map((item) => item.name),
      "Total Deductions",
      "Net Take-Home Salary",
      "Export Date Range",
    ];

    const rows = filteredRoster.map((e) => {
      const earningVals = earningsList.map((item) =>
        getCompAmount(e.earnings, item.id, item.name, (e as any)[item.id]),
      );
      const deductionVals = deductionsList.map((item) =>
        getCompAmount(e.deductions, item.id, item.name, (e as any)[item.id]),
      );

      return [
        `="${e.id}"`,
        `"${e.name.replace(/"/g, '""')}"`,
        `"${e.dept}"`,
        `"${e.role.replace(/"/g, '""')}"`,
        `"${e.bankName || ""}"`,
        `="${e.bankAccountNo || ""}"`,
        `="${e.pfAccountNo || ""}"`,
        ...earningVals,
        e.gross,
        ...deductionVals,
        e.totalDeductions,
        e.net,
        `"${fromPeriod} to ${toPeriod}"`,
      ].join(",");
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `${company.name.replace(/\s+/g, "_")}_Payroll_${fromMonth}${fromYear}_to_${toMonth}${toYear}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onClose();
  };

  return (
    <Overlay onClose={onClose}>
      <div
        className="w-full max-w-[600px] rounded-2xl bg-white p-6 shadow-[0_24px_70px_rgba(0,0,0,0.35)] space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#0F2537] text-white">
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <h3 className="m-0 text-[18px] font-bold text-[#0F2537]">COMM-IT Excel Export</h3>
              <p className="mt-0.5 text-[12.5px] text-mist">
                Export styled Excel workbook (.xlsx) with COMM-IT header banner, brand colors &amp; auto-fit columns.
              </p>
            </div>
          </div>
          <IconButton onClick={onClose} aria-label="Close">
            <X size={18} />
          </IconButton>
        </div>

        {/* Date Range Selection Controls */}
        <div className="rounded-xl border border-line bg-paper/50 p-4 space-y-3">
          <div className="flex items-center gap-2 text-[13px] font-bold text-ink">
            <Calendar size={15} className="text-accent" /> Date Range Filter
          </div>

          <div className="grid grid-cols-2 gap-4 max-xs:grid-cols-1">
            {/* From Month/Year */}
            <div className="space-y-1.5">
              <label className="text-[11.5px] font-bold uppercase tracking-wider text-ash block">
                From Month &amp; Year
              </label>
              <div className="grid grid-cols-2 gap-2">
                <select
                  className={FIELD_INPUT}
                  value={fromMonth}
                  onChange={(e) => setFromMonth(e.target.value)}
                >
                  {MONTHS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <select
                  className={FIELD_INPUT}
                  value={fromYear}
                  onChange={(e) => setFromYear(e.target.value)}
                >
                  {YEARS.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* To Month/Year */}
            <div className="space-y-1.5">
              <label className="text-[11.5px] font-bold uppercase tracking-wider text-ash block">
                To Month &amp; Year
              </label>
              <div className="grid grid-cols-2 gap-2">
                <select
                  className={FIELD_INPUT}
                  value={toMonth}
                  onChange={(e) => setToMonth(e.target.value)}
                >
                  {MONTHS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <select
                  className={FIELD_INPUT}
                  value={toYear}
                  onChange={(e) => setToYear(e.target.value)}
                >
                  {YEARS.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Department Filter */}
          <div className="pt-1">
            <Field label="Department Filter">
              <select
                className={FIELD_INPUT}
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
              >
                {depts.map((d) => (
                  <option key={d} value={d}>
                    {d === "All" ? "All Departments" : `${d} Department`}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </div>

        {/* Summary Card */}
        <div className="rounded-xl border border-line bg-slate-50 p-4 space-y-2 text-[13px]">
          <div className="flex items-center justify-between">
            <span className="text-ash font-medium">Selected Period Range:</span>
            <b className="text-ink font-bold">{fromPeriod} → {toPeriod}</b>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-ash font-medium">Matching Employees:</span>
            <b className="text-ink font-bold">{filteredRoster.length} Employees</b>
          </div>
          <div className="flex items-center justify-between border-t border-line pt-2">
            <span className="text-ash font-medium">Total Gross Payroll:</span>
            <b className="text-ink font-bold">₹{inr0(totalGross)}</b>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-ash font-medium">Total Net Payout:</span>
            <b className="text-earn font-extrabold text-[14px]">₹{inr0(totalNet)}</b>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-line pt-3.5">
          <Button variant="overlayGhost" onClick={onClose}>
            Cancel
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={handleExportCSV}
              className="border border-line bg-paper text-ink hover:bg-slate-100"
            >
              📄 CSV File
            </Button>
            <Button
              onClick={handleExportStyledExcel}
              className="bg-[#0F2537] hover:bg-[#1E3A8A] text-white font-bold"
            >
              <Download size={15} /> Export COMM-IT Excel (.xlsx)
            </Button>
          </div>
        </div>
      </div>
    </Overlay>
  );
}
