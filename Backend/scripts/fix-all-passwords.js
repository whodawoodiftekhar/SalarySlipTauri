import mongoose from "mongoose";
import dotenv from "dotenv";
import { User } from "../src/models/User.js";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/salaryslip";

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB.");

    // Update all users in collection to password 'Payroll@123' if they don't match
    await User.updateMany({}, { $set: { password: "Payroll@123" } });
    console.log("Updated all user accounts in MongoDB to password: Payroll@123");

    const users = await User.find({});
    console.log("Current MongoDB Users:", JSON.stringify(users, null, 2));

    await mongoose.disconnect();
    console.log("Done.");
  } catch (err) {
    console.error("Fix script error:", err);
  }
}

run();
