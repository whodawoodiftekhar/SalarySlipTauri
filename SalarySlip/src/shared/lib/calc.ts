import type {
  CalcMethod,
  ComputedComponent,
  PayrollResult,
  SalaryComponent,
} from "@/shared/types";
import { num, round2 } from "./format";

export const PF_CAP = 1800;

export const CALC_LABELS: Record<CalcMethod, string> = {
  flat: "Flat ₹",
  pct_basic: "% of Basic",
  pct_gross: "% of Gross",
  statutory_pf: "PF (statutory)",
};

/**
 * Resolves a salary structure into rupee amounts. Intended to stay identical
 * to the backend implementation, so the client can preview a run without a
 * round trip.
 *
 * Order matters: flat values settle first so Basic is known, then % of Basic,
 * then % of Gross against the preliminary gross, then statutory PF. Proration
 * is applied last so percentage bases stay on full-month figures.
 */
export function compute(
  components: SalaryComponent[],
  daysInMonth: number,
  daysPayable: number,
): PayrollResult {
  const factor = daysInMonth > 0 ? Math.min(daysPayable / daysInMonth, 1) : 1;
  const amt: Record<string, number> = {};

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
      (c) =>
        c.group === "earning" && (c.calc === "flat" || c.calc === "pct_basic"),
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

  const final: Record<string, number> = {};
  components.forEach((c) => {
    let a = amt[c.id] ?? 0;
    if (c.calc !== "statutory_pf" && c.prorate) a *= factor;
    final[c.id] = round2(a);
  });

  const withAmount = (c: SalaryComponent): ComputedComponent => ({
    ...c,
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

/** Dynamically builds an employee salary structure using components directly from the database catalog. */
export const makeStructure = (
  e: Record<string, any> = {},
  dbComponents: any[] = [],
): SalaryComponent[] => {
  const catalogToUse =
    dbComponents.length > 0
      ? dbComponents
      : [
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

  const list: SalaryComponent[] = catalogToUse.map((comp) => {
    const codeUpper = (comp.code || comp.id || "").toUpperCase();
    const isBasic = codeUpper === "BASIC" || (comp.name && comp.name.toLowerCase().includes("basic"));
    const group = (comp.group || "").toLowerCase().includes("deduct") ? "deduction" : "earning";
    const id = (comp.id || comp.code || comp.name || "").toLowerCase().replace(/\s+/g, "_");

    let calc: CalcMethod = "flat";
    const cStr = String(comp.calc || "").toLowerCase();
    if (cStr.includes("pf") || cStr.includes("statutory")) {
      calc = "statutory_pf";
    } else if (cStr.includes("%") || cStr.includes("pct")) {
      calc = "pct_basic";
    } else {
      calc = "flat";
    }

    let value = 0;
    if (isBasic) {
      value = num(e?.basic);
    } else if (id in (e || {})) {
      value = num(e[id]);
    } else if (comp.code && comp.code.toLowerCase() in (e || {})) {
      value = num(e[comp.code.toLowerCase()]);
    } else if ((id === "project" || id === "project_allowance") && "projectAllowance" in (e || {})) {
      value = num(e.projectAllowance);
    } else {
      const extractedPct = typeof comp.calc === "string" ? num(comp.calc.replace(/[^0-9.]/g, "")) : 0;
      value = num(comp.value ?? (calc === "pct_basic" ? extractedPct : 0));
    }

    return {
      id,
      name: comp.name,
      group: group as "earning" | "deduction",
      calc,
      value,
      prorate: false,
      ...(isBasic ? { isBasic: true } : {}),
    };
  });

  // Automatically append extra specified components if non-zero and not already in structure
  const extras: Array<{ key: string; name: string; group: "earning" | "deduction"; calc: CalcMethod }> = [
    { key: "transport", name: "Transport Allowance", group: "earning", calc: "flat" },
    { key: "projectAllowance", name: "Project Allowance", group: "earning", calc: "flat" },
    { key: "lta", name: "LTA", group: "earning", calc: "flat" },
    { key: "medical", name: "Medical Allowance", group: "earning", calc: "flat" },
    { key: "pf", name: "Provident Fund", group: "deduction", calc: "statutory_pf" },
  ];

  extras.forEach((x) => {
    const val = num(e?.[x.key]);
    if (val > 0) {
      const exists = list.some(
        (c) =>
          c.id === x.key ||
          c.id === x.key.toLowerCase() ||
          c.name.toLowerCase().includes(x.key.toLowerCase()) ||
          (x.key === "projectAllowance" && (c.id === "project" || c.name.toLowerCase().includes("project"))),
      );
      if (!exists) {
        list.push({
          id: x.key === "projectAllowance" ? "project" : x.key,
          name: x.name,
          group: x.group,
          calc: x.calc,
          value: val,
          prorate: false,
        });
      }
    }
  });

  return list;
};
