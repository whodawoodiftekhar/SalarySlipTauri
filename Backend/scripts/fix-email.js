import mongoose from "mongoose";
import dotenv from "dotenv";
import { User, DEFAULT_INITIAL_HR } from "../src/models/User.js";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/salaryslip";

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB.");

    // Update all users in collection to email 'payroll@comm-it.com'
    await User.updateMany(
      {},
      {
        $set: {
          email: "payroll@comm-it.com",
          name: "HR Admin",
          password: "Payroll@123",
          initials: "HR",
        },
      }
    );
    console.log("Updated user email in MongoDB to: payroll@comm-it.com");

    const users = await User.find({});
    console.log("Current MongoDB Users:", JSON.stringify(users, null, 2));

    await mongoose.disconnect();
    console.log("Done.");
  } catch (err) {
    console.error("Fix email script error:", err);
  }
}

run();
