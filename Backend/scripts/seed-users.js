import mongoose from "mongoose";
import dotenv from "dotenv";
import { User, DEFAULT_INITIAL_HR } from "../src/models/User.js";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/salaryslip";

async function run() {
  try {
    console.log("Connecting to MongoDB:", MONGO_URI);
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB.");

    let user = await User.findOne({ email: DEFAULT_INITIAL_HR.email });
    if (!user) {
      user = await User.create({
        name: DEFAULT_INITIAL_HR.name,
        email: DEFAULT_INITIAL_HR.email,
        password: DEFAULT_INITIAL_HR.defaultPassword,
        role: "HR",
        initials: DEFAULT_INITIAL_HR.initials,
      });
      console.log(`[Seed] Created initial user: ${DEFAULT_INITIAL_HR.email}`);
    } else {
      user.password = DEFAULT_INITIAL_HR.defaultPassword;
      await user.save();
      console.log(`[Seed] Updated initial user password: ${DEFAULT_INITIAL_HR.email}`);
    }

    const docs = await User.find({});
    console.log("Current Users in MongoDB:", JSON.stringify(docs, null, 2));

    await mongoose.disconnect();
    console.log("Done.");
  } catch (err) {
    console.error("Seed users script error:", err);
    process.exit(1);
  }
}

run();
