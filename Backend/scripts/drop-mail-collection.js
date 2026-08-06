import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/salaryslip";

async function run() {
  try {
    console.log("Connecting to MongoDB:", MONGO_URI);
    await mongoose.connect(MONGO_URI);
    console.log("Connected.");

    const db = mongoose.connection.db;

    // List all collections
    const collections = await db.listCollections().toArray();
    console.log("Current collections before drop:", collections.map(c => c.name));

    for (const name of ["mailaccount", "mailaccounts"]) {
      const match = collections.find(c => c.name.toLowerCase() === name.toLowerCase());
      if (match) {
        try {
          await db.collection(match.name).drop();
          console.log(`Successfully dropped collection: ${match.name}`);
        } catch (dropErr) {
          console.error(`Error dropping ${match.name}:`, dropErr.message);
        }
      }
    }

    // Also check Admin / Student databases if present
    const adminDb = db.admin();
    const dbs = await adminDb.listDatabases();
    console.log("Available MongoDB Databases:", dbs.databases.map(d => d.name));

    for (const dbInfo of dbs.databases) {
      if (["admin", "config", "local"].includes(dbInfo.name)) continue;
      const targetDb = mongoose.connection.client.db(dbInfo.name);
      const targetCols = await targetDb.listCollections().toArray();
      for (const name of ["mailaccount", "mailaccounts"]) {
        const match = targetCols.find(c => c.name.toLowerCase() === name.toLowerCase());
        if (match) {
          try {
            await targetDb.collection(match.name).drop();
            console.log(`Successfully dropped '${match.name}' from database '${dbInfo.name}'`);
          } catch (e) {
            console.error(`Error dropping '${match.name}' from '${dbInfo.name}':`, e.message);
          }
        }
      }
    }

    const finalCols = await db.listCollections().toArray();
    console.log("Final collections in salaryslip:", finalCols.map(c => c.name));

    await mongoose.disconnect();
    console.log("Done.");
  } catch (err) {
    console.error("Drop script error:", err);
    process.exit(1);
  }
}

run();
