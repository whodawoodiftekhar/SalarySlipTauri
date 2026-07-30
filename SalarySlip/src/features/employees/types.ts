import type { Employee } from "@/shared/types";

/** Request body for creating an employee. */
export type NewEmployeeDto = Employee;

/** Partial update — the code (`id`) itself is not editable. */
export type UpdateEmployeeDto = Partial<Omit<Employee, "id">>;

export interface EmployeeFormState {
  name: string;
  id: string;
  dept: string;
  role: string;
  basic: string;
  special: string;
  onsite: string;
  tds: string;
}
