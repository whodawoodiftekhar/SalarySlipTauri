import type { Employee } from "@/shared/types";
import type { PayslipRecord } from "../types";

/**
 * Reconstructs the Employee shape the printed slip component needs.
 *
 * Bank and PF identifiers live on the employee record, not on the snapshot, so
 * they are looked up live; a slip for a since-deleted employee still opens with
 * the name and totals it was finalized with.
 *
 * Shared by the payslip history and the pay run's results panel, which both open
 * the same viewer — keeping one copy means a slip looks identical either way.
 */
export const employeeFor = (slip: PayslipRecord, roster: Employee[]): Employee =>
  roster.find((e) => e.id === slip.employeeId) ?? {
    id: slip.employeeId,
    name: slip.employeeName,
    email: slip.email,
    dept: slip.dept,
    role: slip.role,
    basic: 0,
    special: 0,
    tds: 0,
    onsite: 0,
  };
