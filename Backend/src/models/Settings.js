import mongoose from "mongoose";

export const DEFAULT_SETTINGS = {
  company: {
    name: "",
    legalName: "",
    city: "",
    pincode: "",
    addressShort: "",
    addressLines: [],
    logoUrl: "",
    watermarkText: "",
    isConfigured: false,
  },
  payPeriod: "",
  standardDays: 30,
  departments: [],
  slipDefaults: {
    bankName: "",
    bankAccountNo: "",
    pfAccountNo: "",
    footNote: "",
  },
  currentUser: {
    initials: "",
    name: "",
    email: "",
  },
};

const companySchema = new mongoose.Schema(
  {
    name: { type: String, default: "" },
    legalName: { type: String, default: "" },
    city: { type: String, default: "" },
    pincode: { type: String, default: "" },
    addressShort: { type: String, default: "" },
    addressLines: {
      type: [String],
      default: [],
    },
    logoUrl: { type: String, default: "" },
    watermarkText: { type: String, default: "" },
    isConfigured: { type: Boolean, default: false },
  },
  { _id: false }
);

const slipDefaultsSchema = new mongoose.Schema(
  {
    bankName: { type: String, default: "" },
    bankAccountNo: { type: String, default: "" },
    pfAccountNo: { type: String, default: "" },
    footNote: {
      type: String,
      default: "",
    },
  },
  { _id: false }
);

const currentUserSchema = new mongoose.Schema(
  {
    initials: { type: String, default: "" },
    name: { type: String, default: "" },
    email: { type: String, default: "" },
  },
  { _id: false }
);

const settingsSchema = new mongoose.Schema(
  {
    company: { type: companySchema, default: () => DEFAULT_SETTINGS.company },
    payPeriod: { type: String, default: "" },
    standardDays: { type: Number, default: 30 },
    departments: {
      type: [String],
      default: [],
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

