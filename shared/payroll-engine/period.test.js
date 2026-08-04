import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  comparePeriodsDesc,
  daysInPeriod,
  financialYearOf,
  formatPeriod,
  isInFinancialYear,
  parsePeriod,
  periodKey,
  periodsInFinancialYear,
} from "./period.js";

describe("parsePeriod / formatPeriod", () => {
  it("round-trips the format payslips are stored with", () => {
    assert.deepEqual(parsePeriod("Jul 2026"), { month: 7, year: 2026 });
    assert.equal(formatPeriod({ month: 7, year: 2026 }), "Jul 2026");
  });

  it("accepts full month names and odd spacing", () => {
    assert.deepEqual(parsePeriod("January  2025"), { month: 1, year: 2025 });
    assert.deepEqual(parsePeriod("  Dec 2025 "), { month: 12, year: 2025 });
  });

  it("returns null instead of guessing", () => {
    assert.equal(parsePeriod(""), null);
    assert.equal(parsePeriod("Jul"), null);
    assert.equal(parsePeriod("13 2026"), null);
    assert.equal(parsePeriod("Xyz 2026"), null);
    assert.equal(parsePeriod(undefined), null);
  });
});

describe("sorting", () => {
  it("orders newest first across a year boundary", () => {
    const sorted = ["Feb 2026", "Dec 2025", "Jan 2026"].sort(comparePeriodsDesc);
    assert.deepEqual(sorted, ["Feb 2026", "Jan 2026", "Dec 2025"]);
  });

  it("keys unparseable periods at zero so they sink to the bottom", () => {
    assert.equal(periodKey("Jul 2026"), 202607);
    assert.equal(periodKey("nonsense"), 0);
  });
});

describe("daysInPeriod", () => {
  it("uses the real calendar length", () => {
    assert.equal(daysInPeriod("Jul 2026"), 31);
    assert.equal(daysInPeriod("Apr 2026"), 30);
    assert.equal(daysInPeriod("Feb 2026"), 28);
    assert.equal(daysInPeriod("Feb 2024"), 29);
  });

  it("falls back to 30 when the period is unreadable", () => {
    assert.equal(daysInPeriod("junk"), 30);
  });
});

describe("financial year (Apr–Mar)", () => {
  it("puts Jan–Mar in the previous starting year", () => {
    assert.deepEqual(financialYearOf("Feb 2026"), { startYear: 2025, label: "2025-26" });
    assert.deepEqual(financialYearOf("Mar 2026"), { startYear: 2025, label: "2025-26" });
  });

  it("starts a new year in April", () => {
    assert.deepEqual(financialYearOf("Apr 2026"), { startYear: 2026, label: "2026-27" });
    assert.deepEqual(financialYearOf("Dec 2026"), { startYear: 2026, label: "2026-27" });
  });

  it("lists the twelve periods in payroll order", () => {
    const periods = periodsInFinancialYear(2026);

    assert.equal(periods.length, 12);
    assert.equal(periods[0], "Apr 2026");
    assert.equal(periods[8], "Dec 2026");
    assert.equal(periods[9], "Jan 2027");
    assert.equal(periods[11], "Mar 2027");
  });

  it("tells whether a period belongs to a given year", () => {
    assert.equal(isInFinancialYear("Mar 2027", 2026), true);
    assert.equal(isInFinancialYear("Apr 2027", 2026), false);
    assert.equal(isInFinancialYear("junk", 2026), false);
  });
});
