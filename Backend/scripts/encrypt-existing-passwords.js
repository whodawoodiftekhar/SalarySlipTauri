import mongoose from "mongoose";
import dotenv from "dotenv";
import { User, seedInitialHRUser } from "../src/models/User.js";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/salaryslip";

async function run() {
  try {
    console.log("Connecting to MongoDB:", MONGO_URI);
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB.");

    await seedInitialHRUser();

    const users = await User.find({}).lean();
    console.log("Current Users in MongoDB:");
    for (const u of users) {
      console.log(`- Email: ${u.email}, Password Format: ${u.password ? (u.password.startsWith('$2b$') ? 'Encrypted (bcrypt)' : 'Plain') : 'None'}`);
    }

    await mongoose.disconnect();
    console.log("Done.");
  } catch (err) {
    console.error("Migration error:", err);
    process.exit(1);
  }
}

run();
