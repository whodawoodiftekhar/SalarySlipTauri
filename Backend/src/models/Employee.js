import mongoose from "mongoose";

/**
 * `id` is the business code the UI shows (C11020), not Mongo's _id.
 * `id: false` turns off Mongoose's built-in id virtual so our own field wins.
 */
const employeeSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, default: "", trim: true },
    dept: { type: String, required: true, trim: true },
    role: { type: String, required: true, trim: true },
    basic: { type: Number, required: true, min: 0 },
    special: { type: Number, default: 0, min: 0 },
    tds: { type: Number, default: 0, min: 0 },
    onsite: { type: Number, default: 0, min: 0 },
    transport: { type: Number, default: 0, min: 0 },
    projectAllowance: { type: Number, default: 0, min: 0 },
    lta: { type: Number, default: 0, min: 0 },
    medical: { type: Number, default: 0, min: 0 },
    pf: { type: Number, default: 0, min: 0 },
    bankName: { type: String, default: "", trim: true },
    bankAccountNo: { type: String, default: "", trim: true },
    pfAccountNo: { type: String, default: "", trim: true },
    ifsc: { type: String, default: "", trim: true },
    pan: { type: String, default: "", trim: true },
    uan: { type: String, default: "", trim: true },
    doj: { type: String, default: "", trim: true },
    paymentMode: { type: String, default: "Bank Transfer", trim: true },
    /**
     * Opens this employee's payslip PDFs, and is quoted in the covering mail.
     * Empty means the PDF is written unencrypted — the behaviour every employee
     * had before this field existed.
     */
    pdfPassword: { type: String, default: "", trim: true },
  },
  {
    strict: false,
    timestamps: true,
    id: false,
    versionKey: false,
    // send the frontend exactly the Employee shape it expects, nothing extra
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

export const Employee = mongoose.model("Employee", employeeSchema);
