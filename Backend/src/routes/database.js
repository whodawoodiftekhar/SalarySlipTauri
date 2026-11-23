import { Router } from "express";
import { Employee } from "../models/Employee.js";
import { CATALOG_SORT, SalaryComponent } from "../models/SalaryComponent.js";
import { SalaryStructure } from "../models/SalaryStructure.js";
import { getSettings, updateSettings } from "../models/Settings.js";
import { PayPeriodDays } from "../models/PayPeriodDays.js";
import { Payslip } from "../models/Payslip.js";
import { MailAccount } from "../models/MailAccount.js";
import { User, encryptPassword } from "../models/User.js";
import { makeStructure, num } from "../lib/calc.js";

const router = Router();

/**
 * GET /api/database/all-collections
 * Retrieves all data from all 8 MongoDB collections for unified multi-sheet Excel export.
 */
router.get("/all-collections", async (req, res) => {
  try {
    const [
      employees,
      salaryComponents,
      salaryStructures,
      settings,
      payPeriodDays,
      payslips,
      mailAccount,
      users,
    ] = await Promise.all([
      Employee.find().sort({ id: 1 }).lean(),
      SalaryComponent.find().sort(CATALOG_SORT).lean(),
      SalaryStructure.find().sort({ employeeId: 1 }).lean(),
      getSettings(),
      PayPeriodDays.find().sort({ period: -1, employeeId: 1 }).lean(),
      Payslip.find().sort({ period: -1, employeeId: 1 }).lean(),
      MailAccount.findOne().lean(),
      User.find().lean(),
    ]);

    res.json({
      ok: true,
      data: {
        employees,
        salaryComponents,
        salaryStructures,
        settings,
        payPeriodDays,
        payslips,
        mailAccount: mailAccount || { user: "" },
        users,
      },
    });
  } catch (err) {
    console.error("[Database Router] Failed to export all collections:", err);
    res.status(500).json({
      ok: false,
      message: err.message || "Failed to fetch database collections",
    });
  }
});

/**
 * POST /api/database/import-all
 * Receives multi-collection data parsed from a single multi-sheet Excel workbook
 * and submits each section to its respective MongoDB collection (all 8 collections).
 */
router.post("/import-all", async (req, res) => {
  try {
    const {
      employees,
      salaryComponents,
      salaryStructures,
      settings,
      payPeriodDays,
      payslips,
      mailAccount,
      users,
    } = req.body || {};

    const summary = {
      employees: { created: 0, updated: 0, total: 0 },
      salaryComponents: { count: 0 },
      salaryStructures: { count: 0 },
      settings: false,
      payPeriodDays: { count: 0 },
      payslips: { count: 0 },
      mailAccount: false,
      users: { count: 0 },
      errors: [],
    };

    const dbCatalog = await SalaryComponent.find().sort(CATALOG_SORT).lean();

    // 1. Process Salary Catalog if present
    if (Array.isArray(salaryComponents) && salaryComponents.length > 0) {
      for (const comp of salaryComponents) {
        try {
          const code = String(comp.code || comp.id || "").trim().toUpperCase();
          const name = String(comp.name || "").trim();
          if (!code || !name) continue;

          await SalaryComponent.findOneAndUpdate(
            { code },
            {
              code,
              name,
              group: String(comp.group || "").toLowerCase().includes("deduct")
                ? "deduction"
                : "earning",
              calc: String(comp.calc || "Flat ₹").trim(),
              taxable: String(comp.taxable || "—").trim(),
              order: comp.order != null ? Number(comp.order) : 0,
            },
            { upsert: true, returnDocument: "after" }
          );
          summary.salaryComponents.count++;
        } catch (e) {
          summary.errors.push(`Catalog item error: ${e.message}`);
        }
      }
    }

    // 2. Process Employees if present
    if (Array.isArray(employees) && employees.length > 0) {
      const stringFields = new Set([
        "id", "name", "email", "dept", "role", "bankName",
        "bankAccountNo", "pfAccountNo", "ifsc", "pan", "uan",
        "doj", "paymentMode", "pdfPassword"
      ]);

      for (const row of employees) {
        const id = String(row.id || "").trim();
        if (!id) continue;

        try {
          const docData = { ...row };
          delete docData._id;
          delete docData.__v;
          delete docData.createdAt;
          delete docData.updatedAt;
          delete docData.rowNumber;
          delete docData.isValid;
          delete docData.errors;
          delete docData.status;

          for (const [key, val] of Object.entries(docData)) {
            if (stringFields.has(key)) {
              docData[key] = val != null ? String(val).trim() : "";
            } else if (typeof val === "number") {
              docData[key] = isNaN(val) ? 0 : val;
            } else if (typeof val === "string") {
              const cleaned = val.replace(/[^0-9.-]+/g, "");
              const n = parseFloat(cleaned);
              docData[key] = isNaN(n) ? val.trim() : n;
            }
          }

          const existing = await Employee.findOne({ id }).lean();
          const updatedEmp = await Employee.findOneAndUpdate(
            { id },
            { $set: docData },
            { upsert: true, returnDocument: "after" }
          );

          if (existing) {
            summary.employees.updated++;
          } else {
            summary.employees.created++;
          }
          summary.employees.total++;

          // Auto-sync salary structure from components
          const baseComponents = makeStructure(updatedEmp, dbCatalog);
          await SalaryStructure.findOneAndUpdate(
            { employeeId: id },
            { employeeId: id, components: baseComponents },
            { upsert: true }
          );
        } catch (e) {
          summary.errors.push(`Employee ${id} error: ${e.message}`);
        }
      }
    }

    // 3. Process Custom Salary Structures if present
    if (Array.isArray(salaryStructures) && salaryStructures.length > 0) {
      const structMap = new Map();
      salaryStructures.forEach((row) => {
        const empId = String(row.employeeId || "").trim();
        if (!empId) return;

        if (Array.isArray(row.components)) {
          structMap.set(empId, row.components);
        } else if (row.componentId || row.id) {
          const list = structMap.get(empId) || [];
          list.push({
            id: String(row.componentId || row.id).trim().toLowerCase(),
            name: String(row.componentName || row.name || "").trim(),
            group: String(row.group || "earning").toLowerCase(),
            calc: String(row.calc || "flat").toLowerCase(),
            value: num(row.value),
            prorate: Boolean(row.prorate),
            fixed: Boolean(row.fixed),
          });
          structMap.set(empId, list);
        }
      });

      for (const [employeeId, components] of structMap.entries()) {
        try {
          await SalaryStructure.findOneAndUpdate(
            { employeeId },
            { employeeId, components },
            { upsert: true, returnDocument: "after" }
          );
          summary.salaryStructures.count++;
        } catch (e) {
          summary.errors.push(`SalaryStructure ${employeeId} error: ${e.message}`);
        }
      }
    }

    // 4. Process Settings if present
    if (settings && typeof settings === "object" && Object.keys(settings).length > 0) {
      try {
        const patch = {};
        for (const [k, v] of Object.entries(settings)) {
          if (v === undefined || v === null || v === "") continue;
          const strKey = String(k).toLowerCase().replace(/[^a-z0-9]/g, "");
          const strVal = String(v).trim();

          if (strKey.includes("companyname") || strKey === "company") {
            patch["company.name"] = strVal;
          } else if (strKey.includes("legalname")) {
            patch["company.legalName"] = strVal;
          } else if (strKey.includes("city")) {
            patch["company.city"] = strVal;
          } else if (strKey.includes("pincode")) {
            patch["company.pincode"] = strVal;
          } else if (strKey.includes("logo")) {
            patch["company.logoUrl"] = strVal;
          } else if (strKey.includes("watermark")) {
            patch["company.watermarkText"] = strVal;
          } else if (strKey.includes("address")) {
            patch["company.addressLines"] = strVal.split(",").map((s) => s.trim()).filter(Boolean);
          } else if (strKey.includes("payperiod") || strKey === "period") {
            patch["payPeriod"] = strVal;
          } else if (strKey.includes("standarddays")) {
            patch["standardDays"] = num(strVal) || 30;
          } else if (strKey.includes("department")) {
            patch["departments"] = strVal.split(",").map((s) => s.trim()).filter(Boolean);
          } else if (strKey.includes("bankname")) {
            patch["slipDefaults.bankName"] = strVal;
          } else if (strKey.includes("bankaccount")) {
            patch["slipDefaults.bankAccountNo"] = strVal;
          } else if (strKey.includes("pf") && (strKey.includes("number") || strKey.includes("account") || strKey.includes("no"))) {
            patch["slipDefaults.pfAccountNo"] = strVal;
          } else if (strKey.includes("footnote")) {
            patch["slipDefaults.footNote"] = strVal;
          } else if (typeof v !== "object") {
            patch[k] = v;
          }
        }

        if (settings.company && typeof settings.company === "object") {
          // If already structured object (e.g. from JSON backup)
          const cleanSettings = { ...settings };
          delete cleanSettings._id;
          delete cleanSettings.__v;
          delete cleanSettings.createdAt;
          delete cleanSettings.updatedAt;
          await updateSettings(cleanSettings);
          summary.settings = true;
        } else if (Object.keys(patch).length > 0) {
          await updateSettings(patch);
          summary.settings = true;
        } else if (settings.company || settings.payPeriod) {
          await updateSettings(settings);
          summary.settings = true;
        }
      } catch (e) {
        summary.errors.push(`Settings error: ${e.message}`);
      }
    }

    // 5. Process PayPeriodDays if present
    if (Array.isArray(payPeriodDays) && payPeriodDays.length > 0) {
      for (const pp of payPeriodDays) {
        try {
          const employeeId = String(pp.employeeId || "").trim();
          const period = String(pp.period || "").trim();
          if (!employeeId || !period) continue;

          await PayPeriodDays.findOneAndUpdate(
            { employeeId, period },
            {
              employeeId,
              period,
              daysInMonth: num(pp.daysInMonth) || 30,
              daysPayable: num(pp.daysPayable) || 30,
            },
            { upsert: true, returnDocument: "after" }
          );
          summary.payPeriodDays.count++;
        } catch (e) {
          summary.errors.push(`PayPeriodDays error: ${e.message}`);
        }
      }
    }

    // 6. Process Payslips if present
    if (Array.isArray(payslips) && payslips.length > 0) {
      for (const p of payslips) {
        try {
          const employeeId = String(p.employeeId || p.id || "").trim();
          const period = String(p.period || "").trim();
          if (!employeeId || !period) continue;

          const daysInMonth = num(p.daysInMonth) || 30;
          const daysPayable = num(p.daysPayable) || 30;
          const gross = num(p.gross);
          const deductions = num(p.deductions || p.totalDeductions);
          const net = num(p.net || (gross - deductions));

          let resultObj = p.result;
          if (!resultObj && p.breakdownJson) {
            try {
              resultObj = typeof p.breakdownJson === "string" ? JSON.parse(p.breakdownJson) : p.breakdownJson;
            } catch {}
          }
          if (!resultObj) {
            resultObj = {
              gross,
              totalDeductions: deductions,
              net,
              earnings: [],
              deductions: [],
              factor: daysInMonth > 0 ? daysPayable / daysInMonth : 1,
            };
          }

          let componentsList = p.components || [];
          if ((!componentsList || componentsList.length === 0) && resultObj?.earnings) {
            componentsList = [
              ...(Array.isArray(resultObj.earnings) ? resultObj.earnings : []),
              ...(Array.isArray(resultObj.deductions) ? resultObj.deductions : []),
            ];
          }

          await Payslip.findOneAndUpdate(
            { employeeId, period },
            {
              $set: {
                employeeId,
                period,
                daysInMonth,
                daysPayable,
                components: componentsList,
                result: resultObj,
                emailedTo: String(p.emailedTo || "").trim(),
                emailedAt: p.emailedAt ? new Date(p.emailedAt) : null,
              },
            },
            { upsert: true, returnDocument: "after" }
          );
          summary.payslips.count++;
        } catch (e) {
          summary.errors.push(`Payslip ${p.employeeId || ""}-${p.period || ""} error: ${e.message}`);
        }
      }
    }

    // 7. Process MailAccount if present
    if (mailAccount && typeof mailAccount === "object") {
      try {
        const user = String(mailAccount.user || mailAccount.email || mailAccount.sender || "").trim();
        if (user) {
          await MailAccount.findOneAndUpdate(
            {},
            { $set: { user } },
            { upsert: true }
          );
          summary.mailAccount = true;
        }
      } catch (e) {
        summary.errors.push(`MailAccount error: ${e.message}`);
      }
    }

    // 8. Process Users if present (Update existing data in-place; do not create duplicate user)
    if (Array.isArray(users) && users.length > 0) {
      for (const u of users) {
        try {
          const email = String(u.email || "").toLowerCase().trim();
          if (!email) continue;

          const rawPass = String(u.password || u.pdfPassword || u.encryptedPassword || "").trim();

          const updateFields = {
            name: String(u.name || "").trim(),
            email,
            role: String(u.role || "User").trim(),
            initials: String(u.initials || "").trim(),
          };

          if (rawPass) {
            updateFields.password = encryptPassword(rawPass);
          }

          // 1. Try finding existing user by email
          let existingUser = await User.findOne({ email });

          // 2. If no user matches this email, check if default seed user exists to update it
          if (!existingUser) {
            existingUser = await User.findOne({ email: "payroll@comm-it.com" });
          }

          // 3. If still not found, update whatever existing user document is in MongoDB
          if (!existingUser) {
            existingUser = await User.findOne({});
          }

          if (existingUser) {
            // Update previous / existing user document in-place
            if (updateFields.name) existingUser.name = updateFields.name;
            existingUser.email = updateFields.email;
            if (updateFields.role) existingUser.role = updateFields.role;
            if (updateFields.initials) existingUser.initials = updateFields.initials;
            if (updateFields.password) {
              existingUser.password = updateFields.password;
            }
            await existingUser.save();
            summary.users.count++;

            // Clean up any leftover default seed account so only the real account remains
            if (email !== "payroll@comm-it.com") {
              await User.deleteMany({ email: "payroll@comm-it.com", _id: { $ne: existingUser._id } });
            }
          } else {
            // Only create new user if database currently has 0 users
            if (!updateFields.password) {
              updateFields.password = encryptPassword("Payroll@123");
            }
            const newUser = await User.create(updateFields);
            summary.users.count++;

            if (email !== "payroll@comm-it.com") {
              await User.deleteMany({ email: "payroll@comm-it.com", _id: { $ne: newUser._id } });
            }
          }
        } catch (e) {
          summary.errors.push(`User ${u.email || ""} error: ${e.message}`);
        }
      }
    }

    res.json({
      success: true,
      summary,
    });
  } catch (err) {
    console.error("[Database Router] Failed to import collections:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to import collections into database",
    });
  }
});

export default router;
