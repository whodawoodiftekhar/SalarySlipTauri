import { apiClient } from "@/services";
import type {
  BulkEmailResult,
  ExportResult,
  PayRunPreview,
  PayRunRequest,
  PayRunResult,
} from "../types";

export const payRunService = {
  /** What the run would produce — writes nothing. */
  async preview(request: PayRunRequest) {
    return apiClient.post<PayRunPreview>("/payroll/run/preview", request);
  },

  /** Finalizes a payslip per selected employee, overwriting any existing one. */
  async finalize(request: PayRunRequest) {
    return apiClient.post<PayRunResult>("/payroll/run", request);
  },

  /** Writes every finalized PDF of the period into a folder on this machine. */
  async exportPdfs(period: string, employeeIds?: string[], folder?: string) {
    return apiClient.post<ExportResult>("/payroll/run/export-pdfs", {
      period,
      employeeIds,
      folder,
    });
  },

  async openFolder(folder: string) {
    return apiClient.post<{ ok: boolean; folder: string }>(
      "/payroll/open-folder",
      { folder },
    );
  },

  async emailAll(period: string, employeeIds?: string[], emailBody?: string) {
    return apiClient.post<BulkEmailResult>("/payroll/run/email", {
      period,
      employeeIds,
      emailBody,
    });
  },
};
