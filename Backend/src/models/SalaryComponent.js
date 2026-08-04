import mongoose from "mongoose";

/** The catalog — building blocks HR can assign to any employee. */
const salaryComponentSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    group: { type: String, enum: ["earning", "deduction"], required: true },
    calc: { type: String, required: true },
    taxable: { type: String, default: "—" },
    /** HR's display position — drives the salary form layout and line order */
    order: { type: Number, default: 0 },
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

export const SalaryComponent = mongoose.model(
  "SalaryComponent",
  salaryComponentSchema,
);

/**
 * The one order the catalog is read in.
 *
 * Every consumer sorts by this: the catalog screen, the salary fields on the
 * add/edit employee forms, and `makeStructure`, which turns the catalog into an
 * employee's structure lines — so the number HR types is also the line order on
 * the payslip. Code is the tiebreak, so components left on 0 stay stable.
 */
export const CATALOG_SORT = { order: 1, code: 1 };
