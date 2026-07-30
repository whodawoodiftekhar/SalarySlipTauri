/**
 * Loads the starter data into MongoDB.
 *   npm run seed
 *
 * Safe to re-run: it clears the three collections first.
 */
import "dotenv/config";
import { connectDB, disconnectDB } from "./config/db.js";
import { makeStructure } from "./lib/calc.js";
import { Employee } from "./models/Employee.js";
import { Payslip } from "./models/Payslip.js";
import { SalaryComponent } from "./models/SalaryComponent.js";
import { SalaryStructure } from "./models/SalaryStructure.js";
import { getSettings } from "./models/Settings.js";

const EMPLOYEES = [
  { id: "C11020", name: "Aisha Rahman", dept: "IT", role: "Senior Software Engineer", basic: 90000, special: 42000, tds: 12000, onsite: 0 },
  { id: "C11021", name: "Rohan Mehta", dept: "IT", role: "Software Engineer", basic: 55000, special: 22000, tds: 5500, onsite: 0 },
  { id: "C11022", name: "Neha Kapoor", dept: "Design", role: "Product Designer", basic: 70000, special: 30000, tds: 8000, onsite: 0 },
  { id: "C11023", name: "Vikram Singh", dept: "IT", role: "Engineering Manager", basic: 150000, special: 80000, tds: 34000, onsite: 25000 },
  { id: "C11024", name: "Sana Iqbal", dept: "HR", role: "HR Executive", basic: 40000, special: 14000, tds: 2000, onsite: 0 },
  { id: "C11025", name: "Arjun Nair", dept: "IT", role: "QA Engineer", basic: 48000, special: 18000, tds: 3800, onsite: 0 },
];

const CATALOG = [
  { code: "BASIC", name: "Basic Salary", group: "earning", calc: "Flat ₹", taxable: "Yes" },
  { code: "HRA", name: "HRA", group: "earning", calc: "% of Basic", taxable: "Partly" },
  { code: "SPECIAL", name: "Special Allowance", group: "earning", calc: "Flat ₹", taxable: "Yes" },
  { code: "ONSITE", name: "Onsite Incentive", group: "earning", calc: "Flat ₹", taxable: "Yes" },
  { code: "MEDICAL", name: "Medical Reimbursement", group: "earning", calc: "Flat ₹", taxable: "No" },
  { code: "PF", name: "Provident Fund", group: "deduction", calc: "PF (statutory)", taxable: "—" },
  { code: "PT", name: "Professional Tax", group: "deduction", calc: "Flat ₹", taxable: "—" },
  { code: "TDS", name: "TDS", group: "deduction", calc: "Flat ₹", taxable: "—" },
];

await connectDB(process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/salaryslip");

console.log("Clearing employees, structures, catalog and payslips…");
await Promise.all([
  Employee.deleteMany({}),
  SalaryStructure.deleteMany({}),
  SalaryComponent.deleteMany({}),
  Payslip.deleteMany({}),
]);

await Employee.insertMany(EMPLOYEES);
await SalaryStructure.insertMany(
  EMPLOYEES.map((e) => ({ employeeId: e.id, components: makeStructure(e) })),
);
await SalaryComponent.insertMany(CATALOG);

// creates the org settings doc from schema defaults if it doesn't exist yet
const settings = await getSettings();

console.log(
  `Seeded ${EMPLOYEES.length} employees, ${CATALOG.length} catalog components, ` +
    `settings for ${settings.company.name}.`,
);

await disconnectDB();
process.exit(0);
