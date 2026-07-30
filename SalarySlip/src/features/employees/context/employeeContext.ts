import { createContext } from "react";
import type { Employee, RosterEntry } from "@/shared/types";
import type { NewEmployeeDto, UpdateEmployeeDto } from "../types";

export interface EmployeeContextValue {
  /** Employees with their standard-month payroll, computed by the API. */
  roster: RosterEntry[];
  /** Plain employee records — includes one just created, before the refetch. */
  employees: Employee[];
  loading: boolean;
  error: Error | null;
  refetch: () => void;
  /** True while any create/update/delete is in flight. */
  saving: boolean;
  /** Resolves with the created employee so callers can navigate to it. */
  addEmployee: (dto: NewEmployeeDto) => Promise<Employee>;
  updateEmployee: (id: string, patch: UpdateEmployeeDto) => Promise<Employee>;
  removeEmployee: (id: string) => Promise<void>;
}

export const EmployeeContext = createContext<EmployeeContextValue | null>(null);
