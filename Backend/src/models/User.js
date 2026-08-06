import mongoose from "mongoose";
import { verifyOutlookAccount } from "../lib/outlookVerify.js";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, default: "HR Admin" },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, default: "HR" },
    initials: { type: String, default: "HR" },
    resetPasswordToken: { type: String, default: null },
    resetPasswordExpires: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false }
);

// Method to verify password (trims whitespace for exact match)
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!candidatePassword || !this.password) return false;
  return String(this.password).trim() === String(candidatePassword).trim();
};

export const User = mongoose.model("User", userSchema, "users");

export const DEFAULT_INITIAL_HR = {
  email: "payroll@comm-it.com",
  name: "HR Admin",
  initials: "HR",
  defaultPassword: "Payroll@123",
};

/**
 * Detects active signed-in Outlook email address from local Outlook profile.
 */
export async function getActiveOutlookEmail() {
  try {
    const verify = await verifyOutlookAccount();
    if (verify && verify.accounts && verify.accounts.length > 0) {
      return verify.accounts[0].toLowerCase();
    }
  } catch {
    /* fallback */
  }
  return DEFAULT_INITIAL_HR.email;
}

/**
 * Seeds default HR user ONLY if the user database is completely empty.
 * Ensures default email is payroll@comm-it.com and password is Payroll@123.
 */
export async function seedInitialHRUser() {
  if (mongoose.connection.readyState !== 1) {
    return;
  }
  try {
    // Strip legacy passwordHash field directly at MongoDB collection level
    await User.collection.updateMany({}, { $unset: { passwordHash: "" } });

    // Ensure initial user document has clean email and password
    const totalUsers = await User.countDocuments();
    if (totalUsers === 0) {
      await User.create({
        name: DEFAULT_INITIAL_HR.name,
        email: DEFAULT_INITIAL_HR.email,
        password: DEFAULT_INITIAL_HR.defaultPassword,
        role: "HR",
        initials: DEFAULT_INITIAL_HR.initials,
      });
      console.log(`[Auth] Initial HR Admin user seeded with email: ${DEFAULT_INITIAL_HR.email}`);
    }
  } catch (err) {
    console.error("[Auth] Error seeding/migrating HR user:", err);
  }
}
