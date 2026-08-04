/**
 * Money-path tests. Run with `npm test` from Backend/ (or `node --test`).
 *
 * These guard the rules that are expensive to get wrong: the PF cap, which lines
 * a part-month reduces, and the order the calc methods resolve in — everything a
 * payslip total depends on.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PF_CAP, compute, dayRates, makeStructure, num, round2 } from "./calc.js";

const line = (over) => ({
  id: "x",
  name: "X",
  group: "earning",
  calc: "flat",
  value: 0,
  prorate: false,
  ...over,
});

const basic = (value) => line({ id: "basic", name: "Basic", value, isBasic: true });

describe("compute — totals", () => {
  it("sums earnings into gross and subtracts deductions to net", () => {
    const res = compute(
      [
        basic(50000),
        line({ id: "special", value: 20000 }),
        line({ id: "tds", group: "deduction", value: 5000 }),
      ],
      30,
      30,
    );

    assert.equal(res.gross, 70000);
    assert.equal(res.totalDeductions, 5000);
    assert.equal(res.net, 65000);
    assert.equal(res.factor, 1);
  });

  it("keeps every line in its own group with an amount attached", () => {
    const res = compute([basic(1000), line({ id: "pt", group: "deduction", value: 200 })], 30, 30);

    assert.deepEqual(
      res.earnings.map((c) => [c.id, c.amount]),
      [["basic", 1000]],
    );
    assert.deepEqual(
      res.deductions.map((c) => [c.id, c.amount]),
      [["pt", 200]],
    );
  });

  it("rounds each amount to paise, not to rupees", () => {
    const res = compute([basic(10000), line({ id: "hra", calc: "pct_basic", value: 33.333 })], 30, 30);

    assert.equal(res.earnings[1].amount, 3333.3);
  });

  it("treats a missing or junk structure as zero rather than throwing", () => {
    assert.equal(compute([], 30, 30).net, 0);
    assert.equal(compute(undefined, 30, 30).net, 0);
    assert.equal(compute([basic("")], 30, 30).gross, 0);
    assert.equal(compute([basic(null)], 30, 30).gross, 0);
  });
});

describe("compute — calc method ordering", () => {
  it("resolves % of Basic off the flat basic even when declared first", () => {
    const res = compute([line({ id: "hra", calc: "pct_basic", value: 50 }), basic(40000)], 30, 30);

    assert.equal(res.earnings[0].amount, 20000);
  });

  it("finds basic by id when no isBasic flag is set", () => {
    const res = compute(
      [line({ id: "basic", name: "Basic", value: 20000 }), line({ id: "hra", calc: "pct_basic", value: 10 })],
      30,
      30,
    );

    assert.equal(res.earnings[1].amount, 2000);
  });

  it("bases % of Gross on flat + % of Basic earnings only", () => {
    // prelim gross = 10000 basic + 5000 hra = 15000; the deduction must not count
    const res = compute(
      [
        basic(10000),
        line({ id: "hra", calc: "pct_basic", value: 50 }),
        line({ id: "tds", group: "deduction", value: 900 }),
        line({ id: "bonus", calc: "pct_gross", value: 10 }),
      ],
      30,
      30,
    );

    assert.equal(res.earnings.find((c) => c.id === "bonus").amount, 1500);
  });

  it("excludes other % of Gross lines from the base so order cannot compound", () => {
    const res = compute(
      [
        basic(10000),
        line({ id: "a", calc: "pct_gross", value: 10 }),
        line({ id: "b", calc: "pct_gross", value: 10 }),
      ],
      30,
      30,
    );

    assert.equal(res.earnings.find((c) => c.id === "a").amount, 1000);
    assert.equal(res.earnings.find((c) => c.id === "b").amount, 1000);
  });
});

describe("compute — statutory PF", () => {
  const pf = (over) => line({ id: "pf", name: "PF", group: "deduction", calc: "statutory_pf", ...over });

  it("takes 12% of basic below the ceiling", () => {
    const res = compute([basic(10000), pf()], 30, 30);
    assert.equal(res.deductions[0].amount, 1200);
  });

  it("caps at the statutory ceiling for high basics", () => {
    const res = compute([basic(90000), pf()], 30, 30);
    assert.equal(res.deductions[0].amount, PF_CAP);
    assert.equal(res.deductions[0].amount, 1800);
  });

  it("follows the reduced basic on a part-month without being asked", () => {
    const res = compute([basic(10000), pf()], 30, 15);
    assert.equal(res.deductions[0].amount, 600);
  });

  it("stays on the full basic when the line is marked fixed", () => {
    const res = compute([basic(10000), pf({ fixed: true })], 30, 15);
    assert.equal(res.deductions[0].amount, 1200);
  });

  it("never double-applies the factor to a prorated PF line", () => {
    // 12% of (90000 * 0.5) = 5400, over the ceiling, so the cap wins outright
    const res = compute([basic(90000), pf()], 30, 15);
    assert.equal(res.deductions[0].amount, PF_CAP);
  });
});

describe("compute — proration factor", () => {
  it("day-rates every earning with nothing having to be ticked", () => {
    // 20/30 days: this is the whole point — fewer days must pay less
    const res = compute([basic(30000), line({ id: "lta", value: 6000 })], 30, 20);

    assert.equal(res.earnings[0].amount, 20000);
    assert.equal(res.earnings[1].amount, 4000);
    assert.equal(res.gross, 24000);
  });

  it("pays a line marked fixed whole however few days are payable", () => {
    const res = compute(
      [basic(30000), line({ id: "medical", value: 6000, fixed: true })],
      30,
      20,
    );

    assert.equal(res.earnings[0].amount, 20000);
    assert.equal(res.earnings[1].amount, 6000);
  });

  it("leaves a flat deduction whole unless that line opts in", () => {
    const res = compute(
      [
        basic(30000),
        line({ id: "tds", group: "deduction", value: 3000 }),
        line({ id: "loan", group: "deduction", value: 1500, prorate: true }),
      ],
      30,
      15,
    );

    assert.equal(res.deductions[0].amount, 3000);
    assert.equal(res.deductions[1].amount, 750);
  });

  it("caps the factor at 1 so extra days cannot inflate pay", () => {
    const res = compute([basic(30000), line({ id: "lta", value: 3000 })], 30, 45);

    assert.equal(res.factor, 1);
    assert.equal(res.earnings[1].amount, 3000);
  });

  it("falls back to a full month instead of dividing by zero", () => {
    const res = compute([line({ id: "lta", value: 3000 })], 0, 0);

    assert.equal(res.factor, 1);
    assert.equal(res.earnings[0].amount, 3000);
  });

  it("applies the % of Basic rate to the full month, then prorates", () => {
    // half month: HRA is 50% of the FULL basic (20000), then halved -> 10000
    const res = compute(
      [basic(40000), line({ id: "hra", calc: "pct_basic", value: 50 })],
      30,
      15,
    );

    assert.equal(res.earnings[1].amount, 10000);
  });
});

describe("dayRates", () => {
  it("day-rates earnings and statutory PF by default", () => {
    assert.equal(dayRates(line()), true);
    assert.equal(
      dayRates(line({ group: "deduction", calc: "statutory_pf" })),
      true,
    );
  });

  it("leaves any other deduction whole unless it opts in", () => {
    assert.equal(dayRates(line({ group: "deduction" })), false);
    assert.equal(dayRates(line({ group: "deduction", prorate: true })), true);
  });

  it("lets fixed override both defaults and an explicit opt-in", () => {
    assert.equal(dayRates(line({ fixed: true })), false);
    assert.equal(dayRates(line({ calc: "statutory_pf", fixed: true })), false);
    assert.equal(
      dayRates(line({ group: "deduction", prorate: true, fixed: true })),
      false,
    );
  });

  it("treats a missing line as not day-rated rather than throwing", () => {
    assert.equal(dayRates(undefined), false);
    assert.equal(dayRates(null), false);
  });
});

describe("makeStructure", () => {
  it("seeds basic from the employee and flags it", () => {
    const list = makeStructure({ basic: 55000 });
    const b = list.find((c) => c.isBasic);

    assert.equal(b.id, "basic");
    assert.equal(b.value, 55000);
    assert.equal(b.calc, "flat");
  });

  it("maps catalog calc labels onto engine calc methods", () => {
    const list = makeStructure(
      { basic: 10000 },
      [
        { code: "BASIC", name: "Basic Salary", group: "earning", calc: "Flat ₹" },
        { code: "HRA", name: "HRA", group: "earning", calc: "% of Basic", value: 40 },
        { code: "PF", name: "Provident Fund", group: "deduction", calc: "PF (statutory)" },
        { code: "TDS", name: "TDS", group: "deduction", calc: "Flat ₹" },
      ],
    );

    assert.equal(list.find((c) => c.id === "hra").calc, "pct_basic");
    assert.equal(list.find((c) => c.id === "hra").value, 40);
    assert.equal(list.find((c) => c.id === "pf").calc, "statutory_pf");
    assert.equal(list.find((c) => c.id === "pf").group, "deduction");
    assert.equal(list.find((c) => c.id === "tds").group, "deduction");
  });

  it("appends employee allowances the catalog does not carry", () => {
    const list = makeStructure({ basic: 10000, lta: 2500 }, [
      { code: "BASIC", name: "Basic Salary", group: "earning", calc: "Flat ₹" },
    ]);

    const lta = list.find((c) => c.id === "lta");
    assert.equal(lta.value, 2500);
    assert.equal(lta.group, "earning");
  });

  it("does not duplicate a line the catalog already provides", () => {
    const list = makeStructure({ basic: 10000, transport: 1600 }, [
      { code: "BASIC", name: "Basic Salary", group: "earning", calc: "Flat ₹" },
      { code: "TRANSPORT", name: "Transport Allowance", group: "earning", calc: "Flat ₹" },
    ]);

    assert.equal(list.filter((c) => c.name === "Transport Allowance").length, 1);
    assert.equal(list.find((c) => c.id === "transport").value, 1600);
  });

  it("skips zero-value allowances", () => {
    const list = makeStructure({ basic: 10000, lta: 0 }, [
      { code: "BASIC", name: "Basic Salary", group: "earning", calc: "Flat ₹" },
    ]);

    assert.equal(list.some((c) => c.id === "lta"), false);
  });

  it("produces a structure a part-month actually reduces", () => {
    // the generated structure ticks nothing, so this only holds because the
    // engine day-rates earnings by default
    const list = makeStructure({ basic: 30000, special: 6000, tds: 1000 });
    const full = compute(list, 30, 30);
    const half = compute(list, 30, 15);

    assert.equal(half.gross, round2(full.gross / 2));
    // TDS is a flat deduction and opts in to nothing, so it stays whole
    assert.equal(half.deductions.find((c) => c.id === "tds").amount, 1000);
  });

  it("produces a structure compute can consume end to end", () => {
    const res = compute(makeStructure({ basic: 50000, special: 20000, tds: 4000 }), 30, 30);

    // basic 50000 + hra 50% 25000 + special 20000
    assert.equal(res.gross, 95000);
    // pf capped 1800 + tds 4000
    assert.equal(res.totalDeductions, 5800);
    assert.equal(res.net, 89200);
  });
});

describe("helpers", () => {
  it("num coerces blanks and junk to zero", () => {
    assert.equal(num(""), 0);
    assert.equal(num(null), 0);
    assert.equal(num(undefined), 0);
    assert.equal(num("abc"), 0);
    assert.equal(num("1200"), 1200);
    assert.equal(num(12.5), 12.5);
  });

  it("round2 keeps paise and survives float error", () => {
    assert.equal(round2(1.005), 1.01);
    assert.equal(round2(0.1 + 0.2), 0.3);
    assert.equal(round2(null), 0);
  });
});
