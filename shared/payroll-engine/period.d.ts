export interface ParsedPeriod {
  /** 1-12 */
  month: number;
  year: number;
}

export interface FinancialYear {
  /** calendar year the April of this FY falls in */
  startYear: number;
  /** "2026-27" */
  label: string;
}

export declare const MONTHS: string[];

export declare function parsePeriod(period: string): ParsedPeriod | null;

export declare function formatPeriod(p: ParsedPeriod): string;

export declare function periodKey(period: string): number;

export declare function comparePeriodsDesc(a: string, b: string): number;

export declare function daysInPeriod(period: string): number;

export declare function financialYearOf(period: string): FinancialYear | null;

export declare function periodsInFinancialYear(startYear: number): string[];

export declare function isInFinancialYear(
  period: string,
  startYear: number,
): boolean;
