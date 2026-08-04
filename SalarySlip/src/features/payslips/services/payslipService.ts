import { apiClient } from "@/services";
import type {
  EmailOutcome,
  PayslipExportResult,
  PayslipRecord,
  PeriodSummary,
  YtdStatement,
} from "../types";

const query = (params: Record<string, string | undefined>) => {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v != null && v !== "") as [string, string][],
  ).toString();
  return qs ? `?${qs}` : "";
};

export const payslipService = {
  /** Finalized history, newest period first. */
  async list(filters: { employeeId?: string; period?: string; fy?: string } = {}) {
    return apiClient.get<PayslipRecord[]>(`/payroll/payslips${query(filters)}`);
  },

  async get(id: string) {
    return apiClient.get<PayslipRecord>(`/payroll/payslips/${id}`);
  },

  /** Every period that has payslips, with its totals. */
  async periods() {
    return apiClient.get<PeriodSummary[]>("/payroll/periods");
  },

  /** Financial-year statement; omit `fy` for the employee's latest year. */
  async ytd(employeeId: string, fy?: number) {
    return apiClient.get<YtdStatement>(
      `/payroll/ytd/${employeeId}${query({ fy: fy == null ? undefined : String(fy) })}`,
    );
  },

  /**
   * Sends a finalized payslip. `fallbackToDraft` asks the server to open an
   * Outlook draft when the direct send cannot go through, so the mail is never
   * silently lost — used by the per-employee screen, never by bulk.
   */
  async email(
    id: string,
    options: {
      to?: string;
      emailBody?: string;
      via?: "auto" | "smtp" | "outlook";
      fallbackToDraft?: boolean;
    } = {},
  ) {
    return apiClient.post<EmailOutcome>(`/payroll/payslips/${id}/email`, options);
  },

  /**
   * Writes the given payslips into Downloads, one folder per period, creating
   * folders only where they are missing.
   */
  async exportPdfs(payslipIds: string[], folder?: string) {
    return apiClient.post<PayslipExportResult>("/payroll/payslips/export-pdfs", {
      payslipIds,
      folder,
    });
  },

  async openFolder(folder: string) {
    return apiClient.post<{ ok: boolean; folder: string }>(
      "/payroll/open-folder",
      { folder },
    );
  },

  async remove(id: string) {
    return apiClient.delete<void>(`/payroll/payslips/${id}`);
  },
};
