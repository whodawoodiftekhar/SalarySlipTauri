import { apiClient } from "@/services";
import type {
  PayrollResult,
  RosterEntry,
  SalaryComponent,
  StructureSeed,
} from "@/shared/types";
import type { FinalizedPayslip, PayrollRunDto } from "../types";

export const payrollService = {
  /** Every employee with their standard-month payroll, computed server-side. */
  async getRoster(): Promise<RosterEntry[]> {
    return apiClient.get<RosterEntry[]>("/payroll/roster");
  },

  /** The salary structure stored against one employee. */
  async getStructure(employeeId: string): Promise<SalaryComponent[]> {
    return apiClient.get<SalaryComponent[]>(
      `/employees/${employeeId}/salary-structure`,
    );
  },

  async saveStructure(
    employeeId: string,
    components: SalaryComponent[],
  ): Promise<SalaryComponent[]> {
    return apiClient.put<SalaryComponent[]>(
      `/employees/${employeeId}/salary-structure`,
      components,
    );
  },

  /** Net estimate for an employee who doesn't exist yet. */
  async preview(seed: StructureSeed): Promise<PayrollResult> {
    return apiClient.post<PayrollResult>("/payroll/preview", seed);
  },

  /** Persists the payslip and the structure snapshot it was built from. */
  async finalize(run: PayrollRunDto): Promise<FinalizedPayslip> {
    return apiClient.post<FinalizedPayslip>("/payroll/payslips", run);
  },
};
