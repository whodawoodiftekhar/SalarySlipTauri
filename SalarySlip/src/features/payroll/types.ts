import type { PayrollResult, SalaryComponent } from "@/shared/types";

/** What the payroll screen posts when HR finalizes a slip. */
export interface PayrollRunDto {
  employeeId: string;
  period: string;
  daysInMonth: number;
  daysPayable: number;
  components: SalaryComponent[];
}

export interface FinalizedPayslip {
  id: string;
  employeeId: string;
  period: string;
  result: PayrollResult;
}
