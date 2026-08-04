/**
 * Pay-period helpers — re-export only. Implementation is shared with the React
 * app in shared/payroll-engine/period.js so history sorting and financial-year
 * grouping cannot disagree between the two sides.
 */
export {
  MONTHS,
  comparePeriodsDesc,
  daysInPeriod,
  financialYearOf,
  formatPeriod,
  isInFinancialYear,
  parsePeriod,
  periodKey,
  periodsInFinancialYear,
} from "../../../shared/payroll-engine/period.js";
