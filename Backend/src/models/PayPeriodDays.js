import mongoose from "mongoose";

/**
 * Days payable for one employee in one period — the LOP register.
 *
 * These used to live only in the payroll screen's component state, so leaving
 * the page lost them and the bulk pay run had nothing to read (it defaulted
 * everyone to a full month). Keyed by period rather than stored on the salary
 * structure because LOP is a fact about a month, not a standing property of the
 * employee: August must not inherit July's absences.
 */
const payPeriodDaysSchema = new mongoose.Schema(
  {
    employeeId: { type: String, required: true, index: true },
    period: { type: String, required: true },
    daysInMonth: { type: Number, required: true, min: 0 },
    daysPayable: { type: Number, required: true, min: 0 },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform(_doc, ret) {
        delete ret._id;
        delete ret.createdAt;
        delete ret.updatedAt;
        return ret;
      },
    },
  },
);

payPeriodDaysSchema.index({ employeeId: 1, period: 1 }, { unique: true });

export const PayPeriodDays = mongoose.model(
  "PayPeriodDays",
  payPeriodDaysSchema,
  "payperioddays",
);

/** Days payable can never exceed the month, nor go negative. */
export const clampDaysPayable = (daysPayable, daysInMonth) => {
  const dim = Number(daysInMonth);
  const dpay = Number(daysPayable);
  if (!Number.isFinite(dim) || dim <= 0) return 0;
  if (!Number.isFinite(dpay)) return dim;
  return Math.min(Math.max(dpay, 0), dim);
};

/**
 * Records the day counts a payslip was finalized with, so reopening the period
 * — on either screen — shows what was actually paid.
 */
export async function upsertDayCount({
  employeeId,
  period,
  daysInMonth,
  daysPayable,
}) {
  if (!employeeId || !period) return null;

  const dim = Number(daysInMonth);
  if (!Number.isFinite(dim) || dim <= 0) return null;

  return PayPeriodDays.findOneAndUpdate(
    { employeeId, period },
    {
      employeeId,
      period,
      daysInMonth: dim,
      daysPayable: clampDaysPayable(daysPayable, dim),
    },
    { returnDocument: "after", upsert: true, runValidators: true },
  );
}
