import mongoose from "mongoose";
import { componentSchema } from "./SalaryStructure.js";

const payslipSchema = new mongoose.Schema(
  {
    employeeId: { type: String, required: true, index: true },
    period: { type: String, required: true },
    daysInMonth: { type: Number, required: true },
    daysPayable: { type: Number, required: true },
    /** snapshot of the structure at the moment HR finalized */
    components: { type: [componentSchema], default: [] },
    /** computed totals, stored so a reprint never re-derives differently */
    result: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform(_doc, ret) {
        ret.id = String(ret._id);
        delete ret._id;
        return ret;
      },
    },
  },
);

// one payslip per employee per period — finalizing again overwrites it
payslipSchema.index({ employeeId: 1, period: 1 }, { unique: true });

export const Payslip = mongoose.model("Payslip", payslipSchema);
