import crypto from "node:crypto";

if (typeof globalThis.crypto === "undefined") {
  globalThis.crypto = crypto;
}

// TextDecoder polyfill for fontkit/pdfkit ascii encoding compatibility in Node/pkg
if (typeof globalThis.TextDecoder !== "undefined") {
  const OrigTD = globalThis.TextDecoder;
  globalThis.TextDecoder = class extends OrigTD {
    constructor(encoding, options) {
      if (encoding && String(encoding).toLowerCase().replace(/[^a-z0-9]/g, "") === "ascii") {
        super("utf-8", options);
      } else {
        super(encoding, options);
      }
    }
  };
}

import "dotenv/config";
import cors from "cors";
import express from "express";
import mongoose from "mongoose";
import { connectDBWithRetry } from "./config/db.js";
import { installPdfFontResolver, standardFontsAvailable } from "./lib/pdfFonts.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";
import catalogRoutes from "./routes/catalog.js";
import employeeRoutes from "./routes/employees.js";
import payrollRoutes from "./routes/payroll.js";
import settingsRoutes from "./routes/settings.js";

const PORT = process.env.PORT ?? 5000;
const MONGODB_URI =
  process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/salaryslip";
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? "*";

// Must run before pdfkit resolves any standard font.
installPdfFontResolver();

const app = express();

app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());

app.get("/api/health", (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  res.json({
    ok: true,
    dbConnected: isDbConnected,
    dbState: mongoose.connection.readyState,
    pdfFontsAvailable: standardFontsAvailable(),
    message: isDbConnected
      ? "Connected to MongoDB"
      : "Waiting for local MongoDB..."
  });
});

/**
 * POSTs that render/deliver a payslip from data the client already holds. They
 * touch no collection, so a cold MongoDB must not turn them into a 503 — that
 * used to surface in the UI as "Failed to generate PDF download."
 */
const DB_FREE_POST_PATHS = new Set([
  "/generate-pdf",
  "/launch-outlook",
]);

// Middleware to check DB connection for data endpoints
const checkDbConnection = (req, res, next) => {
  if (DB_FREE_POST_PATHS.has(req.path)) return next();

  if (mongoose.connection.readyState !== 1) {
    if (req.method === "GET") {
      res.setHeader("X-DB-Connected", "false");
      // If endpoint is settings, return DEFAULT_SETTINGS
      if (req.baseUrl === "/api/settings" || req.path === "/settings") {
        return res.json({
          company: {
            name: "COMM-IT",
            legalName: "COMM-IT INDIA PVT. LTD.",
            city: "New Delhi",
            pincode: "110025",
            addressShort: "New Delhi 110025",
            addressLines: [
              "S-113, First Floor, Salcon Aurum, Jasola District Centre",
              "Opposite Omax Square, New Delhi 110025",
            ],
          },
          payPeriod: "Jul 2026",
          standardDays: 30,
          departments: ["IT", "Design", "HR", "Finance", "Operations"],
          slipDefaults: {
            bankName: "HDFC Bank",
            bankAccountNo: "XXXXXXXXX",
            pfAccountNo: "DL-XXXXXXXXXX",
            footNote: "This is a computer generated salary slip and does not require signature",
          },
          currentUser: {
            initials: "HR",
            name: "HR Admin",
            email: "payroll@comm-it.com",
          },
        });
      }
      // For all other GET endpoints when DB is offline, return empty list
      return res.json([]);
    }
    return res.status(503).json({
      error: "Service Unavailable",
      message: "Cannot save changes because local MongoDB is offline. Please start local MongoDB.",
      dbConnected: false
    });
  }
  next();
};

app.use("/api/settings", checkDbConnection, settingsRoutes);
app.use("/api/employees", checkDbConnection, employeeRoutes);
app.use("/api/salary-components", checkDbConnection, catalogRoutes);
app.use("/api/payroll", checkDbConnection, payrollRoutes);

app.use(notFound);
app.use(errorHandler);

// Start server immediately
app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}/api`);
  console.log(`CORS allowed for ${CORS_ORIGIN}`);
  // Start DB connection loop asynchronously
  connectDBWithRetry(MONGODB_URI);
});

