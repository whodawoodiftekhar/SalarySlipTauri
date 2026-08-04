/**
 * Pay-period helpers. A period is the human string the whole app already
 * stores on every payslip — "Jul 2026" — so anything that needs to sort
 * history, group a financial year, or default the day count has to parse it.
 *
 * Shared by both sides for the same reason as calc.js: the history screen and
 * the YTD endpoint must agree on which months belong to a financial year.
 */

export const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** "Jul 2026" -> { month: 7, year: 2026 }. Null when unparseable. */
export function parsePeriod(period) {
  const m = String(period ?? "")
    .trim()
    .match(/^([A-Za-z]{3,})\s+(\d{4})$/);
  if (!m) return null;

  const idx = MONTHS.findIndex(
    (x) => x.toLowerCase() === m[1].slice(0, 3).toLowerCase(),
  );
  if (idx < 0) return null;

  return { month: idx + 1, year: Number(m[2]) };
}

/** { month: 7, year: 2026 } -> "Jul 2026". */
export function formatPeriod({ month, year }) {
  return `${MONTHS[Math.min(Math.max(Number(month), 1), 12) - 1]} ${year}`;
}

/** Sortable integer — 202607 for "Jul 2026", 0 when unparseable. */
export function periodKey(period) {
  const p = parsePeriod(period);
  return p ? p.year * 100 + p.month : 0;
}

/** Newest first, so it can be dropped straight into Array#sort. */
export function comparePeriodsDesc(a, b) {
  return periodKey(b) - periodKey(a);
}

/** Real length of the month a period names — Feb is 28 or 29, not 30. */
export function daysInPeriod(period) {
  const p = parsePeriod(period);
  if (!p) return 30;
  return new Date(p.year, p.month, 0).getDate();
}

/**
 * Indian financial year (Apr–Mar) a period falls in.
 * "Feb 2026" -> { startYear: 2025, label: "2025-26" }
 */
export function financialYearOf(period) {
  const p = parsePeriod(period);
  if (!p) return null;

  const startYear = p.month >= 4 ? p.year : p.year - 1;
  return {
    startYear,
    label: `${startYear}-${String((startYear + 1) % 100).padStart(2, "0")}`,
  };
}

/** The 12 period strings of a financial year, Apr first. */
export function periodsInFinancialYear(startYear) {
  const y = Number(startYear);
  return Array.from({ length: 12 }, (_, i) => {
    const month = ((3 + i) % 12) + 1;
    return formatPeriod({ month, year: month >= 4 ? y : y + 1 });
  });
}

/** True when `period` sits inside the financial year starting `startYear`. */
export function isInFinancialYear(period, startYear) {
  const fy = financialYearOf(period);
  return fy != null && fy.startYear === Number(startYear);
}
