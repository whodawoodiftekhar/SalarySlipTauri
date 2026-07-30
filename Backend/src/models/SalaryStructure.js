import mongoose from "mongoose";

/** One editable line of a salary structure. */
export const componentSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    group: { type: String, enum: ["earning", "deduction"], required: true },
    calc: {
      type: String,
      enum: ["flat", "pct_basic", "pct_gross", "statutory_pf"],
      required: true,
    },
    // Mixed because the UI binds it straight to a text input
    value: { type: mongoose.Schema.Types.Mixed, default: 0 },
    prorate: { type: Boolean, default: false },
    isBasic: { type: Boolean },
  },
  { _id: false, id: false },
);

/** The structure assigned to one employee. */
const salaryStructureSchema = new mongoose.Schema(
  {
    employeeId: { type: String, required: true, unique: true, index: true },
    components: { type: [componentSchema], default: [] },
  },
  { timestamps: true, versionKey: false },
);

export const SalaryStructure = mongoose.model(
  "SalaryStructure",
  salaryStructureSchema,
);
