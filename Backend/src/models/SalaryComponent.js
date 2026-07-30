import mongoose from "mongoose";

/** The catalog — building blocks HR can assign to any employee. */
const salaryComponentSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    group: { type: String, enum: ["earning", "deduction"], required: true },
    calc: { type: String, required: true },
    taxable: { type: String, default: "—" },
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
