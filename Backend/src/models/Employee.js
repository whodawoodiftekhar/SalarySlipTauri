import mongoose from "mongoose";

/**
 * `id` is the business code the UI shows (C11020), not Mongo's _id.
 * `id: false` turns off Mongoose's built-in id virtual so our own field wins.
 */
const employeeSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    dept: { type: String, required: true, trim: true },
    role: { type: String, required: true, trim: true },
    basic: { type: Number, required: true, min: 0 },
    special: { type: Number, default: 0, min: 0 },
    tds: { type: Number, default: 0, min: 0 },
    onsite: { type: Number, default: 0, min: 0 },
    bankName: { type: String, default: "", trim: true },
    bankAccountNo: { type: String, default: "", trim: true },
    pfAccountNo: { type: String, default: "", trim: true },
  },
  {
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
