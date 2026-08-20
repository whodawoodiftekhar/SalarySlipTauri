import type { Employee } from "@/shared/types";

/** Request body for creating an employee. */
export type NewEmployeeDto = Employee;

/** Partial update — employee code (`id`) and other profile fields. */
export type UpdateEmployeeDto = Partial<Employee>;

export interface EmployeeFormState {
  name: string;
  email: string;
  id: string;
  dept: string;
  role: string;
  basic: string;
  special: string;
  onsite: string;
  transport: string;
  projectAllowance: string;
  lta: string;
  medical: string;
  pf: string;
  tds: string;
  bankName: string;
  bankAccountNo: string;
  pfAccountNo: string;
  ifsc: string;
  pan: string;
  uan: string;
  doj: string;
  paymentMode: string;
  pdfPassword: string;
}
