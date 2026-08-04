import type { PayrollResult, SalaryComponent } from "@/shared/types";

/** A finalized payslip as the history API returns it — snapshot plus joined employee columns. */
export interface PayslipRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  email: string;
  dept: string;
  role: string;
  period: string;
  daysInMonth: number;
  daysPayable: number;
  components: SalaryComponent[];
  result: PayrollResult;
  finalizedAt: string | null;
  emailedAt: string | null;
  emailedTo: string;
}

export interface PeriodSummary {
  period: string;
  count: number;
  gross: number;
  totalDeductions: number;
  net: number;
}

export interface YtdComponent {
  id: string;
  name: string;
  group: "earning" | "deduction";
  amount: number;
}

export interface YtdStatement {
  employeeId: string;
  employeeName: string;
  financialYear: { startYear: number; label: string } | null;
  availableYears: number[];
  monthsPaid: number;
  periods: {
    id: string;
    period: string;
    gross: number;
    totalDeductions: number;
    net: number;
  }[];
  totals: { gross: number; totalDeductions: number; net: number };
  components: YtdComponent[];
}

export interface PayslipExportResult {
  /** the single period folder, or the shared root when periods were mixed */
  folder: string;
  /** every folder written to, one per period */
  folders: string[];
  /** false when the folders already existed and files were overwritten */
  created: boolean;
  saved: { employeeId: string; period: string; fileName: string; folder: string }[];
  failed: { employeeId: string; employeeName: string; message: string }[];
}

/** Outcome of a single send — `skipped` means nothing was attempted. */
export interface EmailOutcome {
  success: boolean;
  skipped?: boolean;
  recipient: string;
  message: string;
  emailedAt?: string;
  via?: "smtp" | "outlook";
  /** folder the attached PDF was written to */
  savedTo?: string;
  fileName?: string;
  /** the send failed and an Outlook draft was opened instead */
  draftOpened?: boolean;
}
