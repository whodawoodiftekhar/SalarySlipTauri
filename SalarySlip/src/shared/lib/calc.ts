/**
 * Payroll engine — re-export only.
 *
 * The implementation lives in shared/payroll-engine/calc.js (aliased @engine),
 * which the Express API imports too. It used to be copy-pasted on both sides,
 * and any drift silently meant the total previewed here was not the total the
 * API stored. Only display concerns belong in this file now.
 */
import type { CalcMethod } from "@/shared/types";

export { PF_CAP, compute, dayRates, makeStructure } from "@engine/calc.js";

export const CALC_LABELS: Record<CalcMethod, string> = {
  flat: "Flat ₹",
  pct_basic: "% of Basic",
  pct_gross: "% of Gross",
  statutory_pf: "PF (statutory)",
};

/**
 * The calculation methods a catalog component may be given, as the strings the
 * engine parses back. Both component dialogs offer exactly this list, so a
 * component cannot be saved with a method the payroll engine will not read.
 */
export const CALC_OPTIONS = Object.values(CALC_LABELS);
