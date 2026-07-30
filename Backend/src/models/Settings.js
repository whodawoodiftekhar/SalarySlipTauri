import mongoose from "mongoose";

/**
 * Single-document org configuration. Everything the UI used to hardcode —
 * company details, pay period, departments, payslip bank/PF placeholders —
 * lives here so it can be edited without a rebuild.
 */
const settingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: "app", unique: true },

    company: {
      name: { type: String, default: "COMM-IT" },
      legalName: { type: String, default: "COMM-IT INDIA PVT. LTD." },
      addressShort: { type: String, default: "New Delhi 110025" },
      addressLines: {
        type: [String],
        default: [
          "S-113, First Floor, Salcon Aurum, Jasola District Centre",
          "Opposite Omax Square, New Delhi 110025",
        ],
      },
    },

    payPeriod: { type: String, default: "Jul 2026" },
    standardDays: { type: Number, default: 30 },
    departments: {
      type: [String],
      default: ["IT", "Design", "HR", "Finance", "Operations"],
    },

    slipDefaults: {
      bankName: { type: String, default: "HDFC Bank" },
      bankAccountNo: { type: String, default: "XXXXXXXXX" },
      pfAccountNo: { type: String, default: "DL-XXXXXXXXXX" },
      footNote: {
        type: String,
        default:
          "This is a computer generated salary slip and does not require signature",
      },
    },

    currentUser: {
      initials: { type: String, default: "HR" },
      name: { type: String, default: "HR Admin" },
      email: { type: String, default: "payroll@comm-it.com" },
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform(_doc, ret) {
        delete ret._id;
        delete ret.key;
        delete ret.createdAt;
        delete ret.updatedAt;
        return ret;
      },
    },
  },
);

export const Settings = mongoose.model("Settings", settingsSchema);

export const DEFAULT_SETTINGS = {
  company: {
    name: "COMM-IT",
    legalName: "COMM-IT INDIA PVT. LTD.",
    addressShort: "New Delhi 110025",
    addressLines: [
      "S-113, First Floor, Salcon Aurum, Jasola District Centre",
      "Opposite Omax Square, New Delhi 110025",
    ],
  },
  payPeriod: "Jul 2026",
  standardDays: 30,
  departments: ["IT", "Design", "HR", "Finance", "Operations"],
  slipDefaults: {
    bankName: "HDFC Bank",
    bankAccountNo: "XXXXXXXXX",
    pfAccountNo: "DL-XXXXXXXXXX",
    footNote: "This is a computer generated salary slip and does not require signature",
  },
  currentUser: {
    initials: "HR",
    name: "HR Admin",
    email: "payroll@comm-it.com",
  },
};

/** Reads the singleton, creating it from schema defaults on first call. Fallbacks to defaults if DB offline. */
export async function getSettings() {
  if (mongoose.connection.readyState !== 1) {
    return DEFAULT_SETTINGS;
  }
  try {
    const doc = await Settings.findOneAndUpdate(
      { key: "app" },
      { $setOnInsert: { key: "app" } },
      { returnDocument: "after", upsert: true, setDefaultsOnInsert: true },
    );
    return doc ?? DEFAULT_SETTINGS;
  } catch (err) {
    console.warn("Could not query DB settings, returning default settings:", err.message);
    return DEFAULT_SETTINGS;
  }
}
