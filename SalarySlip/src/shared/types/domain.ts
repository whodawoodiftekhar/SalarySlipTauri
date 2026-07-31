/**
 * The domain model — these shapes are what the API/DB will return.
 * Feature-local view models and request DTOs live in each feature's types.ts.
 */

export type ComponentGroup = "earning" | "deduction";

export type CalcMethod = "flat" | "pct_basic" | "pct_gross" | "statutory_pf";

/** A single line in an employee's salary structure. */
export interface SalaryComponent {
  id: string;
  name: string;
  group: ComponentGroup;
  calc: CalcMethod;
  /** kept loose because the editor binds it straight to an <input> */
  value: number | string;
  prorate: boolean;
  isBasic?: boolean;
}

export interface ComputedComponent extends SalaryComponent {
  amount: number;
}

export interface PayrollResult {
  earnings: ComputedComponent[];
  deductions: ComputedComponent[];
  gross: number;
  totalDeductions: number;
  net: number;
  /** days-payable / days-in-month, capped at 1 */
  factor: number;
}

export interface Employee {
  id: string;
  name: string;
  dept: string;
  role: string;
  basic: number;
  special: number;
  tds: number;
  onsite: number;
  bankName?: string;
  bankAccountNo?: string;
  pfAccountNo?: string;
}

/** The fields the default salary structure is generated from. */
export type StructureSeed = Pick<
  Employee,
  "basic" | "special" | "onsite" | "tds"
>;

export type RosterEntry = Employee & PayrollResult;

export interface CatalogItem {
  code: string;
  name: string;
  group: ComponentGroup;
  calc: string;
  taxable: string;
}

export interface CompanyProfile {
  name: string;
  legalName: string;
  /** Bundled logo URL — the lockup includes the wordmark and tagline. */
  logo: string;
  addressShort: string;
  addressLines: string[];
}
