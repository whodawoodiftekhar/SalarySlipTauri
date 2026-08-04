/**
 * Payroll engine — re-export only.
 *
 * The implementation lives in shared/payroll-engine/calc.js, which the React
 * app imports too. It used to be copy-pasted on both sides, and any drift
 * silently meant the total HR approved in the preview was not the total stored
 * here. Keep this file a shim so existing `../lib/calc.js` imports stay valid.
 *
 * The engine sits *outside* this package, so a bare `nodemon src/server.js`
 * would not notice edits to it — the API would keep serving the previous
 * calculation with no sign anything was stale. The dev script therefore passes
 * `--watch ../shared` explicitly; if you ever run the server another way, restart
 * it by hand after touching the engine.
 */
export {
  PF_CAP,
  compute,
  dayRates,
  makeStructure,
  num,
  round2,
} from "../../../shared/payroll-engine/calc.js";
