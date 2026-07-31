import mongoose from "mongoose";

export const DEFAULT_SETTINGS = {
  company: {
    name: "COMM-IT",
    legalName: "COMM-IT INDIA PVT. LTD.",
    addressShort: "New Delhi 110025",
    addressLines: [
      "S-113, First Floor, Salcon Aurum, Jasola District Centre",
      "Opposite Omax Square, New Delhi 110025",
    ],
    logoUrl: "",
    watermarkText: "",
    isConfigured: false,
  },
  payPeriod: "Jul 2026",
  standardDays: 30,
  departments: ["IT", "Design", "HR", "Finance", "Operations"],
  slipDefaults: {
    bankName: "HDFC Bank",
    bankAccountNo: "XXXXXXXXX",
    pfAccountNo: "DL-XXXXXXXXXX",
    footNote:
      "This is a computer generated salary slip and does not require signature",
  },
  currentUser: {
    initials: "HR",
    name: "HR Admin",
    email: "payroll@comm-it.com",
  },
};

const companySchema = new mongoose.Schema(
  {
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
    logoUrl: { type: String, default: "" },
    watermarkText: { type: String, default: "" },
    isConfigured: { type: Boolean, default: false },
  },
  { _id: false }
);

const slipDefaultsSchema = new mongoose.Schema(
  {
    bankName: { type: String, default: "HDFC Bank" },
    bankAccountNo: { type: String, default: "XXXXXXXXX" },
    pfAccountNo: { type: String, default: "DL-XXXXXXXXXX" },
    footNote: {
      type: String,
      default:
        "This is a computer generated salary slip and does not require signature",
    },
  },
  { _id: false }
);

const currentUserSchema = new mongoose.Schema(
  {
    initials: { type: String, default: "HR" },
    name: { type: String, default: "HR Admin" },
    email: { type: String, default: "payroll@comm-it.com" },
  },
  { _id: false }
);

const settingsSchema = new mongoose.Schema(
  {
    company: { type: companySchema, default: () => DEFAULT_SETTINGS.company },
    payPeriod: { type: String, default: "Jul 2026" },
    standardDays: { type: Number, default: 30 },
    departments: {
      type: [String],
      default: ["IT", "Design", "HR", "Finance", "Operations"],
    },
    slipDefaults: {
      type: slipDefaultsSchema,
      default: () => DEFAULT_SETTINGS.slipDefaults,
    },
    currentUser: {
      type: currentUserSchema,
      default: () => DEFAULT_SETTINGS.currentUser,
    },
  },
  { timestamps: true, versionKey: false }
);

export const CompanySetup = mongoose.model(
  "CompanySetup",
  settingsSchema,
  "companysetup"
);

export async function getSettings() {
  if (mongoose.connection.readyState !== 1) {
    return DEFAULT_SETTINGS;
  }
  try {
    let settingsDoc = await CompanySetup.findOne().lean();
    if (!settingsDoc) {
      settingsDoc = await CompanySetup.create(DEFAULT_SETTINGS);
      settingsDoc = settingsDoc.toObject();
    }
    const { _id, createdAt, updatedAt, ...rest } = settingsDoc;
    return rest;
  } catch (err) {
    console.error("[Settings] Error reading from DB:", err);
    return DEFAULT_SETTINGS;
  }
}

export async function updateSettings(data) {
  if (mongoose.connection.readyState !== 1) {
    return { ...DEFAULT_SETTINGS, ...data };
  }
  const updatedDoc = await CompanySetup.findOneAndUpdate(
    {},
    { $set: data },
    { upsert: true, returnDocument: "after", runValidators: true }
  ).lean();
  const { _id, createdAt, updatedAt, ...rest } = updatedDoc;
  return rest;
}

