import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, default: "HR" },
    initials: { type: String, default: "HR" },
  },
  { timestamps: true, versionKey: false }
);

// Method to verify password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.passwordHash);
};

// Static helper to hash password
userSchema.statics.hashPassword = async function (password) {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

export const User = mongoose.model("User", userSchema, "users");

/**
 * Removes hardcoded default HR user (payroll@comm-it.com) and unsets obsolete hrId fields from MongoDB.
 */
export async function cleanupObsoleteData() {
  if (mongoose.connection.readyState !== 1) {
    return;
  }
  try {
    // Delete hardcoded default HR user document from database
    await User.deleteMany({ email: "payroll@comm-it.com" });
    // Strip obsolete hrId field from all existing user documents in MongoDB
    await User.updateMany({ hrId: { $exists: true } }, { $unset: { hrId: "" } });
  } catch (err) {
    console.error("[Auth] Error cleaning up obsolete data:", err);
  }
}
