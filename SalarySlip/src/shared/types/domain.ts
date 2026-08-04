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
  /** force-day-rate a deduction that would otherwise be paid whole */
  prorate: boolean;
  /** pay this line whole however few days are payable */
  fixed?: boolean;
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
  email?: string;
  dept: string;
  role: string;
  basic: number;
  special: number;
  tds: number;
  onsite: number;
  transport?: number;
  projectAllowance?: number;
  lta?: number;
  medical?: number;
  pf?: number;
  bankName?: string;
  bankAccountNo?: string;
  pfAccountNo?: string;
  ifsc?: string;
  pan?: string;
  uan?: string;
  doj?: string;
  paymentMode?: string;
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
  /**
   * Display position HR sets on the catalog screen. It orders the salary fields
   * on the employee forms and the structure lines behind the payslip, so #1 is
   * the first field, #2 the one beside it, #3 the next row down.
   */
  order?: number;
}

export interface CompanyProfile {
  name: string;
  legalName: string;
  /** Bundled logo URL — the lockup includes the wordmark and tagline. */
  logo: string;
  city?: string;
  pincode?: string;
  addressShort: string;
  addressLines: string[];
}
