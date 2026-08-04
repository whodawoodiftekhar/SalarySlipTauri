/**
 * Types for calc.js. Declared structurally rather than imported from the app
 * so the engine stays free of any frontend path alias — the React types in
 * SalarySlip/src/shared/types are structurally identical and interchangeable.
 */

export type EngineGroup = "earning" | "deduction";

export type EngineCalc = "flat" | "pct_basic" | "pct_gross" | "statutory_pf";

export interface EngineComponent {
  id: string;
  name: string;
  group: EngineGroup;
  calc: EngineCalc;
  /** loose because the editor binds it straight to an <input> */
  value: number | string;
  /** force-day-rate a deduction that would otherwise be paid whole */
  prorate: boolean;
  /** pay this line whole however few days are payable */
  fixed?: boolean;
  isBasic?: boolean;
}

export interface EngineResult<T> {
  earnings: (T & { amount: number })[];
  deductions: (T & { amount: number })[];
  gross: number;
  totalDeductions: number;
  net: number;
  /** days-payable / days-in-month, capped at 1 */
  factor: number;
}

export declare const PF_CAP: number;

export declare function round2(n: number | null | undefined): number;

export declare function num(v: unknown): number;

/** Whether a part-month reduces this line. */
export declare function dayRates(c: Partial<EngineComponent> | undefined): boolean;

export declare function compute<T extends EngineComponent>(
  components: readonly T[],
  daysInMonth: number,
  daysPayable: number,
): EngineResult<T>;

export declare function makeStructure(
  e?: Record<string, unknown>,
  dbComponents?: unknown[],
): EngineComponent[];
