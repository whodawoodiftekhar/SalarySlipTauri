import type { SalaryComponent } from "@/shared/types";

/** One employee in a bulk run, as /run/preview returns them. */
export interface PayRunRow {
  employeeId: string;
  employeeName: string;
  dept: string;
  role: string;
  email: string;
  daysInMonth: number;
  daysPayable: number;
  lopDays: number;
  gross: number;
  totalDeductions: number;
  net: number;
  factor: number;
  /** day-rating is reducing pay, because the structure has lines marked prorate */
  dayRated: boolean;
  /** fewer days entered, but nothing in the structure day-rates */
  lopHasNoEffect: boolean;
  /** days came from the LOP register saved on the per-employee screen */
  daysFromRegister: boolean;
  hasStructure: boolean;
  hasEmail: boolean;
  alreadyFinalized: boolean;
  previousNet: number | null;
  /** only present on the preview — lets the screen re-total locally */
  components?: SalaryComponent[];
}

export interface PayRunSummary {
  headcount: number;
  gross: number;
  totalDeductions: number;
  net: number;
  alreadyFinalized: number;
  missingEmail: number;
  missingStructure: number;
  withLop: number;
  lopWithoutEffect: number;
}

export interface PayRunPreview {
  period: string;
  daysInMonth: number;
  standardDays: number;
  calendarDays: number;
  rows: PayRunRow[];
  summary: PayRunSummary;
}

export type PayRunStatus = "finalized" | "replaced" | "error";

export interface PayRunResultRow extends PayRunRow {
  payslipId: string | null;
  status: PayRunStatus;
  message?: string;
}

export interface PayRunResult {
  period: string;
  daysInMonth: number;
  rows: PayRunResultRow[];
  summary: {
    headcount: number;
    gross: number;
    totalDeductions: number;
    net: number;
    finalized: number;
    replaced: number;
    failed: number;
  };
}

export interface ExportResult {
  period: string;
  /** where the PDFs went — under Downloads unless a folder was passed */
  folder: string;
  /** false when the folder already existed and files were overwritten */
  created: boolean;
  saved: { employeeId: string; fileName: string }[];
  failed: { employeeId: string; employeeName: string; message: string }[];
}

export interface BulkEmailResult {
  period: string;
  /** which route actually delivered — SMTP, or the desktop Outlook profile */
  via?: "smtp" | "outlook" | "auto";
  rows: {
    employeeId: string;
    employeeName: string;
    success: boolean;
    skipped?: boolean;
    recipient: string;
    message: string;
    via?: "smtp" | "outlook";
    /** folder the attached PDF was written to */
    savedTo?: string;
    fileName?: string;
  }[];
  summary: { sent: number; skipped: number; failed: number };
}

/** What the screen posts for both preview and finalize. */
export interface PayRunRequest {
  period: string;
  daysInMonth: number;
  employeeIds?: string[];
  days?: Record<string, number>;
}
