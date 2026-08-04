/**
 * The payroll engine — the ONE implementation.
 *
 * Both sides import this file, so a preview HR approves in the browser and the
 * amount the API stores can no longer drift apart:
 *   - Backend/src/lib/calc.js        re-exports it (bundled by esbuild/pkg)
 *   - SalarySlip/src/shared/lib/calc.ts re-exports it (aliased as @engine)
 *
 * Plain ESM JavaScript with no dependencies on purpose: it has to run inside
 * the Vite bundle, inside the pkg'd exe, and under `node --test` unchanged.
 * Types live beside it in calc.d.ts.
 */

/** Statutory employee PF is capped at 12% of ₹15,000. */
export const PF_CAP = 1800;

const PF_RATE = 0.12;

export const round2 = (n) =>
  Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;

/** Tolerant number coercion — empty inputs and junk become 0. */
export const num = (v) =>
  v === "" || v == null || isNaN(Number(v)) ? 0 : Number(v);

/**
 * Whether a part-month reduces this line.
 *
 * Earnings and statutory PF are day-rated by default — 20 days payable out of
 * 30 means 20 days of salary, and PF is 12% of the Basic actually paid. This
 * used to be a per-line opt-in, which meant a part-month run quietly paid a
 * full month on every structure where nobody had ticked anything.
 *
 * The two escapes stay explicit:
 *   - `fixed: true`    pays the line whole no matter how few days are payable
 *                      (a reimbursement, a fixed bonus)
 *   - `prorate: true`  day-rates a deduction that would otherwise stay whole
 *                      (a loan instalment; TDS and PT normally should not)
 */
export const dayRates = (c) =>
  c && !c.fixed
    ? c.group === "earning" || c.calc === "statutory_pf" || Boolean(c.prorate)
    : false;

/**
 * Resolves a salary structure into rupee amounts.
 *
 * Order matters: flat values settle first so Basic is known, then % of Basic,
 * then % of Gross against the preliminary gross, then statutory PF. Proration
 * is applied last so percentage bases stay on full-month figures.
 */
export function compute(components, daysInMonth, daysPayable) {
  const list = Array.isArray(components) ? components : [];
  const dim = num(daysInMonth);
  const factor = dim > 0 ? Math.min(num(daysPayable) / dim, 1) : 1;
  const amt = {};

  const basicC = list.find((c) => c.isBasic) ?? list.find((c) => c.id === "basic");

  list.forEach((c) => {
    if (c.calc === "flat") amt[c.id] = num(c.value);
  });

  const basic = basicC ? (amt[basicC.id] ?? 0) : 0;

  list.forEach((c) => {
    if (c.calc === "pct_basic") amt[c.id] = basic * (num(c.value) / 100);
  });

  const grossPrelim = list
    .filter(
      (c) => c.group === "earning" && (c.calc === "flat" || c.calc === "pct_basic"),
    )
    .reduce((s, c) => s + (amt[c.id] ?? 0), 0);

  list.forEach((c) => {
    if (c.calc === "pct_gross") amt[c.id] = grossPrelim * (num(c.value) / 100);
  });

  list.forEach((c) => {
    if (c.calc === "statutory_pf") {
      amt[c.id] = Math.min(basic * (dayRates(c) ? factor : 1) * PF_RATE, PF_CAP);
    }
  });

  const final = {};
  list.forEach((c) => {
    let a = amt[c.id] ?? 0;
    // PF already had the factor folded into its own base above
    if (c.calc !== "statutory_pf" && dayRates(c)) a *= factor;
    final[c.id] = round2(a);
  });

  // mongoose hands us hydrated subdocuments; spreading one keeps its internals
  const withAmount = (c) => ({
    ...(typeof c.toObject === "function" ? c.toObject() : c),
    amount: final[c.id] ?? 0,
  });

  const earnings = list.filter((c) => c.group === "earning").map(withAmount);
  const deductions = list.filter((c) => c.group === "deduction").map(withAmount);

  const gross = round2(earnings.reduce((s, c) => s + c.amount, 0));
  const totalDeductions = round2(deductions.reduce((s, c) => s + c.amount, 0));

  return {
    earnings,
    deductions,
    gross,
    totalDeductions,
    net: round2(gross - totalDeductions),
    factor,
  };
}

/** Fallback catalog when the database has no components seeded yet. */
const FALLBACK_CATALOG = [
  { code: "BASIC", name: "Basic Salary", group: "earning", calc: "Flat ₹" },
  { code: "HRA", name: "HRA", group: "earning", calc: "% of Basic", value: 50 },
  { code: "SPECIAL", name: "Special Allowance", group: "earning", calc: "Flat ₹" },
  { code: "ONSITE", name: "Onsite Incentive", group: "earning", calc: "Flat ₹" },
  { code: "TRANSPORT", name: "Transport Allowance", group: "earning", calc: "Flat ₹" },
  { code: "PROJECT", name: "Project Allowance", group: "earning", calc: "Flat ₹" },
  { code: "LTA", name: "LTA", group: "earning", calc: "Flat ₹" },
  { code: "MEDICAL", name: "Medical Reimbursement", group: "earning", calc: "Flat ₹" },
  { code: "PF", name: "Provident Fund", group: "deduction", calc: "PF (statutory)" },
  { code: "TDS", name: "TDS", group: "deduction", calc: "Flat ₹" },
];

/** Employee fields that become their own line when non-zero. */
const EXTRA_LINES = [
  { key: "transport", name: "Transport Allowance", group: "earning", calc: "flat" },
  { key: "projectAllowance", name: "Project Allowance", group: "earning", calc: "flat" },
  { key: "lta", name: "LTA", group: "earning", calc: "flat" },
  { key: "medical", name: "Medical Allowance", group: "earning", calc: "flat" },
  { key: "pf", name: "Provident Fund", group: "deduction", calc: "statutory_pf" },
];

/** Builds an employee salary structure from the database catalog. */
export const makeStructure = (e = {}, dbComponents = []) => {
  const catalogToUse =
    Array.isArray(dbComponents) && dbComponents.length > 0
      ? dbComponents
      : FALLBACK_CATALOG;

  const list = catalogToUse.map((comp) => {
    const codeUpper = (comp.code || comp.id || "").toUpperCase();
    const isBasic =
      codeUpper === "BASIC" ||
      (comp.name && comp.name.toLowerCase().includes("basic"));
    const group = (comp.group || "").toLowerCase().includes("deduct")
      ? "deduction"
      : "earning";
    const id = (comp.id || comp.code || comp.name || "")
      .toLowerCase()
      .replace(/\s+/g, "_");

    let calc = "flat";
    const cStr = String(comp.calc || "").toLowerCase();
    if (cStr.includes("pf") || cStr.includes("statutory")) {
      calc = "statutory_pf";
    } else if (cStr.includes("%") || cStr.includes("pct")) {
      calc = "pct_basic";
    }

    let value = 0;
    if (isBasic) {
      value = num(e?.basic);
    } else if (id in (e || {})) {
      value = num(e[id]);
    } else if (comp.code && comp.code.toLowerCase() in (e || {})) {
      value = num(e[comp.code.toLowerCase()]);
    } else if (
      (id === "project" || id === "project_allowance") &&
      "projectAllowance" in (e || {})
    ) {
      value = num(e.projectAllowance);
    } else {
      const extractedPct =
        typeof comp.calc === "string" ? num(comp.calc.replace(/[^0-9.]/g, "")) : 0;
      value = num(comp.value ?? (calc === "pct_basic" ? extractedPct : 0));
    }

    // both flags off: earnings and PF day-rate by default (see dayRates), and a
    // flat deduction such as TDS stays whole
    return {
      id,
      name: comp.name,
      group,
      calc,
      value,
      prorate: false,
      fixed: false,
      ...(isBasic ? { isBasic: true } : {}),
    };
  });

  EXTRA_LINES.forEach((x) => {
    const val = num(e?.[x.key]);
    if (val <= 0) return;

    const exists = list.some(
      (c) =>
        c.id === x.key ||
        c.id === x.key.toLowerCase() ||
        c.name.toLowerCase().includes(x.key.toLowerCase()) ||
        (x.key === "projectAllowance" &&
          (c.id === "project" || c.name.toLowerCase().includes("project"))),
    );
    if (exists) return;

    list.push({
      id: x.key === "projectAllowance" ? "project" : x.key,
      name: x.name,
      group: x.group,
      calc: x.calc,
      value: val,
      prorate: false,
      fixed: false,
    });
  });

  return list;
};
