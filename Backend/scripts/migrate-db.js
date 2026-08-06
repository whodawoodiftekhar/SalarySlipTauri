import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/salaryslip";

async function run() {
  try {
    console.log("Connecting to MongoDB:", MONGO_URI);
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB.");

    const collections = await mongoose.connection.db.listCollections().toArray();

    for (const name of ["mailaccount", "mailaccounts"]) {
      const found = collections.find((c) => c.name === name);
      if (found) {
        await mongoose.connection.db.collection(name).drop();
        console.log(`SUCCESS: Dropped '${name}' collection from MongoDB.`);
      }
    }

    const remainingCols = await mongoose.connection.db.listCollections().toArray();
    console.log("Remaining Collections in MongoDB:", remainingCols.map((c) => c.name));

    await mongoose.disconnect();
    console.log("Done.");
  } catch (err) {
    console.error("Drop collection script error:", err);
    process.exit(1);
  }
}

run();
