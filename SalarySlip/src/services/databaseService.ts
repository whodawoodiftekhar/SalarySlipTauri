import { apiClient } from "@/services";

export interface DatabaseCollectionsPayload {
  employees?: any[];
  salaryComponents?: any[];
  salaryStructures?: any[];
  settings?: any;
  payPeriodDays?: any[];
  payslips?: any[];
  mailAccount?: any;
  users?: any[];
}

export interface ImportAllResponse {
  success: boolean;
  summary: {
    employees: { created: number; updated: number; total: number };
    salaryComponents: { count: number };
    salaryStructures: { count: number };
    settings: boolean;
    payPeriodDays: { count: number };
    payslips: { count: number };
    mailAccount: boolean;
    users: { count: number };
    errors: string[];
  };
}

export const databaseService = {
  async getAllCollections() {
    return apiClient.get<{
      ok: boolean;
      data: {
        employees: any[];
        salaryComponents: any[];
        salaryStructures: any[];
        settings: any;
        payPeriodDays: any[];
        payslips: any[];
        mailAccount: any;
        users: any[];
      };
    }>("/database/all-collections");
  },

  async importAllCollections(payload: DatabaseCollectionsPayload): Promise<ImportAllResponse> {
    return apiClient.post<ImportAllResponse>("/database/import-all", payload);
  },
};
