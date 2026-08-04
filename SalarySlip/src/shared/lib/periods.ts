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

/** Returns the previous (count - 1) months + current month (default 3 months total: 2 previous months + current month). */
export function getRecentPeriods(
  monthsCount = 3,
  refPeriodStr?: string,
): string[] {
  let baseDate = new Date();
  if (refPeriodStr && typeof refPeriodStr === "string") {
    const parts = refPeriodStr.trim().split(/\s+/);
    const mIndex = MONTHS.indexOf(parts[0]);
    const year = parseInt(parts[1] || "", 10);
    if (mIndex !== -1 && !isNaN(year)) {
      baseDate = new Date(year, mIndex, 1);
    }
  }

  const result: string[] = [];
  for (let i = monthsCount - 1; i >= 0; i--) {
    const d = new Date(baseDate.getFullYear(), baseDate.getMonth() - i, 1);
    result.push(`${MONTHS[d.getMonth()]} ${d.getFullYear()}`);
  }
  return result;
}

export const getRecentPeriodsForPeriod = getRecentPeriods;

export function getCurrentPeriod(refDate = new Date()): string {
  return `${MONTHS[refDate.getMonth()]} ${refDate.getFullYear()}`;
}

/** Selectable period options: previous 2 months + current month (3 months total). */
export const PERIOD_OPTIONS = getRecentPeriods(3);


