/**
 * Pay-period helpers for the UI, backed by the same module the API uses so
 * "Jul 2026" is parsed identically on both sides.
 */
export {
  MONTHS,
  comparePeriodsDesc,
  daysInPeriod,
  financialYearOf,
  formatPeriod,
  parsePeriod,
  periodKey,
} from "@engine/period.js";

import { MONTHS } from "@engine/period.js";

/** Years the period pickers offer. */
export const PERIOD_YEARS = [2025, 2026, 2027];

/** Every selectable period, oldest first. */
export const PERIOD_OPTIONS = PERIOD_YEARS.flatMap((y) =>
  MONTHS.map((m) => `${m} ${y}`),
);
