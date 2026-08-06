import mongoose from "mongoose";
import dotenv from "dotenv";
import { User, encryptPassword, DEFAULT_INITIAL_HR } from "../src/models/User.js";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/salaryslip";

async function run() {
  try {
    console.log("Connecting to MongoDB:", MONGO_URI);
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB.");

    const users = await User.find({});
    for (const u of users) {
      // Replace legacy bcrypt hash with plain password Payroll@123 (AES encrypted)
      u.password = encryptPassword(DEFAULT_INITIAL_HR.defaultPassword);
      await u.save();
      console.log(`[Password Migration] Reset user ${u.email} password to clean AES encrypted 'Payroll@123'.`);
    }

    await mongoose.disconnect();
    console.log("Done.");
  } catch (err) {
    console.error("Migration error:", err);
    process.exit(1);
  }
}

run();
