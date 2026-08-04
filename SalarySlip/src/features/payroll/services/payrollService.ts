import { apiClient } from "@/services";
import type {
  PayrollResult,
  RosterEntry,
  SalaryComponent,
  StructureSeed,
} from "@/shared/types";
import type { DayCount, FinalizedPayslip, PayrollRunDto } from "../types";

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

  /**
   * Days payable saved for this employee and period, or null when the period
   * has not been touched yet (caller falls back to the company standard days).
   */
  async getDays(employeeId: string, period: string): Promise<DayCount | null> {
    const rows = await apiClient.get<DayCount[]>(
      `/payroll/days?employeeId=${encodeURIComponent(employeeId)}&period=${encodeURIComponent(period)}`,
    );
    return rows[0] ?? null;
  },

  /** Remembers the day counts so leaving the screen no longer loses them. */
  async saveDays(
    employeeId: string,
    period: string,
    daysInMonth: number,
    daysPayable: number,
  ): Promise<DayCount> {
    return apiClient.put<DayCount>(`/payroll/days/${employeeId}`, {
      period,
      daysInMonth,
      daysPayable,
    });
  },
};
