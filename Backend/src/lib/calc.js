/**
 * Payroll engine — re-export only.
 *
 * The implementation lives in shared/payroll-engine/calc.js, which the React
 * app imports too. It used to be copy-pasted on both sides, and any drift
 * silently meant the total HR approved in the preview was not the total stored
 * here. Keep this file a shim so existing `../lib/calc.js` imports stay valid.
 */
export {
  PF_CAP,
  compute,
  makeStructure,
  num,
  round2,
} from "../../../shared/payroll-engine/calc.js";
