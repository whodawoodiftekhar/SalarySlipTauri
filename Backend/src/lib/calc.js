/**
 * Payroll engine — must stay in step with the frontend copy at
 * SalarySlip/src/shared/lib/calc.js so previews match what gets saved.
 */

export const PF_CAP = 1800;

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

const num = (v) => (v === "" || v == null || isNaN(Number(v)) ? 0 : Number(v));

export function compute(components, daysInMonth, daysPayable) {
  const factor = daysInMonth > 0 ? Math.min(daysPayable / daysInMonth, 1) : 1;
  const amt = {};

  const basicC =
    components.find((c) => c.isBasic) ?? components.find((c) => c.id === "basic");

  components.forEach((c) => {
    if (c.calc === "flat") amt[c.id] = num(c.value);
  });

  const basic = basicC ? (amt[basicC.id] ?? 0) : 0;

  components.forEach((c) => {
    if (c.calc === "pct_basic") amt[c.id] = basic * (num(c.value) / 100);
  });

  const grossPrelim = components
    .filter(
      (c) => c.group === "earning" && (c.calc === "flat" || c.calc === "pct_basic"),
    )
    .reduce((s, c) => s + (amt[c.id] ?? 0), 0);

  components.forEach((c) => {
    if (c.calc === "pct_gross") amt[c.id] = grossPrelim * (num(c.value) / 100);
  });

  components.forEach((c) => {
    if (c.calc === "statutory_pf") {
      amt[c.id] = Math.min(basic * (c.prorate ? factor : 1) * 0.12, PF_CAP);
    }
  });

  const final = {};
  components.forEach((c) => {
    let a = amt[c.id] ?? 0;
    if (c.calc !== "statutory_pf" && c.prorate) a *= factor;
    final[c.id] = round2(a);
  });

  const withAmount = (c) => ({
    ...(typeof c.toObject === "function" ? c.toObject() : c),
    amount: final[c.id] ?? 0,
  });

  const earnings = components.filter((c) => c.group === "earning").map(withAmount);
  const deductions = components
    .filter((c) => c.group === "deduction")
    .map(withAmount);

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

/** The default structure attached to every new employee. */
export const makeStructure = (e) => [
  { id: "basic", name: "Basic Salary", group: "earning", calc: "flat", value: e.basic, prorate: true, isBasic: true },
  { id: "hra", name: "HRA", group: "earning", calc: "pct_basic", value: 50, prorate: true },
  { id: "transport", name: "Transport Allowance", group: "earning", calc: "flat", value: 1600, prorate: true },
  { id: "special", name: "Special Allowance", group: "earning", calc: "flat", value: e.special ?? 0, prorate: true },
  { id: "medical", name: "Medical Reimbursement", group: "earning", calc: "flat", value: 1250, prorate: false },
  { id: "onsite", name: "Onsite Incentive", group: "earning", calc: "flat", value: e.onsite ?? 0, prorate: false },
  { id: "pf", name: "PF", group: "deduction", calc: "statutory_pf", value: 0, prorate: true },
  { id: "pt", name: "Professional Tax", group: "deduction", calc: "flat", value: 200, prorate: false },
  { id: "tds", name: "TDS", group: "deduction", calc: "flat", value: e.tds ?? 0, prorate: false },
];
