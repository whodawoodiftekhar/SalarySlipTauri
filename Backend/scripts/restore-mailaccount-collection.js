import mongoose from "mongoose";
import dotenv from "dotenv";
import { MailAccount, saveMailAccount } from "../src/models/MailAccount.js";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/salaryslip";

async function run() {
  try {
    console.log("Connecting to MongoDB:", MONGO_URI);
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB.");

    // Restore mailaccount collection document
    await saveMailAccount({ user: "v-dawood@comm-it.in" });
    console.log("Restored 'mailaccount' collection in MongoDB.");

    const doc = await MailAccount.findOne().lean();
    console.log("Current document in 'mailaccount' collection:", doc);

    await mongoose.disconnect();
    console.log("Done.");
  } catch (err) {
    console.error("Restore script error:", err);
    process.exit(1);
  }
}

run();
