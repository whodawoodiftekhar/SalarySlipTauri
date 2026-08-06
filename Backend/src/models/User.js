import mongoose from "mongoose";
import crypto from "node:crypto";
import { verifyOutlookAccount } from "../lib/outlookVerify.js";
import { describeMailAccount } from "./MailAccount.js";

// AES-256 Encryption key & algorithm for secure DB password encryption
const ENCRYPTION_SECRET = process.env.ENCRYPTION_SECRET || "salaryslip-secret-key-32-chars!!";
const ALGORITHM = "aes-256-cbc";

/**
 * Encrypts plain text password into encrypted hex string stored in MongoDB.
 */
export function encryptPassword(plainText) {
  if (!plainText) return "";
  if (plainText.startsWith("enc:")) return plainText; // Already encrypted
  try {
    const key = crypto.scryptSync(ENCRYPTION_SECRET, "salt", 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(String(plainText).trim(), "utf8", "hex");
    encrypted += cipher.final("hex");
    return `enc:${iv.toString("hex")}:${encrypted}`;
  } catch (err) {
    console.error("[User Model] Encryption error:", err);
    return plainText;
  }
}

/**
 * Decrypts encrypted MongoDB password back into original plain text.
 */
export function decryptPassword(cipherText) {
  if (!cipherText) return "";
  if (!cipherText.startsWith("enc:")) return cipherText; // Return as-is if plain text
  try {
    const parts = cipherText.split(":");
    const iv = Buffer.from(parts[1], "hex");
    const encryptedText = parts[2];
    const key = crypto.scryptSync(ENCRYPTION_SECRET, "salt", 32);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(encryptedText, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (err) {
    console.error("[User Model] Decryption error:", err);
    return cipherText;
  }
}

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

// Method to verify password against candidate
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!candidatePassword || !this.password) return false;
  const decryptedPass = decryptPassword(this.password);
  return String(decryptedPass).trim() === String(candidatePassword).trim();
};

export const User = mongoose.model("User", userSchema, "users");

export const DEFAULT_INITIAL_HR = {
  email: "payroll@comm-it.com",
  name: "HR Admin",
  initials: "HR",
  defaultPassword: "Payroll@123",
};

/**
 * Detects active signed-in Outlook email address from local Outlook profile or settings.
 */
export async function getActiveOutlookEmail() {
  try {
    const mailAcc = await describeMailAccount();
    if (mailAcc && mailAcc.user) {
      return mailAcc.user.toLowerCase();
    }
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
 * Encrypts all user passwords in MongoDB securely.
 */
export async function seedInitialHRUser() {
  if (mongoose.connection.readyState !== 1) {
    return;
  }
  try {
    // Strip legacy passwordHash field directly at MongoDB collection level
    await User.collection.updateMany({}, { $unset: { passwordHash: "" } });

    // Encrypt all user passwords in MongoDB
    const usersToEncrypt = await User.find({});
    for (const u of usersToEncrypt) {
      if (u.password && !u.password.startsWith("enc:")) {
        u.password = encryptPassword(u.password);
        await u.save();
        console.log(`[Auth Migration] Encrypted password in MongoDB for ${u.email}`);
      }
    }

    const totalUsers = await User.countDocuments();
    if (totalUsers === 0) {
      const encryptedDefaultPass = encryptPassword(DEFAULT_INITIAL_HR.defaultPassword);
      await User.create({
        name: DEFAULT_INITIAL_HR.name,
        email: DEFAULT_INITIAL_HR.email,
        password: encryptedDefaultPass,
        role: "HR",
        initials: DEFAULT_INITIAL_HR.initials,
      });
      console.log(`[Auth] Initial HR Admin user seeded with encrypted password: ${DEFAULT_INITIAL_HR.email}`);
    }
  } catch (err) {
    console.error("[Auth] Error seeding/encrypting HR user:", err);
  }
}
