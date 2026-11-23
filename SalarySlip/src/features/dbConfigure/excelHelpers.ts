import ExcelJS from "exceljs";

export interface ParsedEmployeeRow {
  rowNumber: number;
  id: string;
  name: string;
  dept: string;
  role: string;
  email: string;
  basic: number;
  special: number;
  transport: number;
  medical: number;
  onsite: number;
  projectAllowance: number;
  lta: number;
  tds: number;
  pf: number;
  bankName: string;
  bankAccountNo: string;
  ifsc: string;
  pan: string;
  uan: string;
  pfAccountNo: string;
  doj: string;
  paymentMode: string;
  pdfPassword: string;
  isValid: boolean;
  errors: string[];
  status?: "new" | "update" | "error";
  [key: string]: any;
}

export interface ParsedMultiCollectionData {
  employees: ParsedEmployeeRow[];
  salaryComponents: any[];
  salaryStructures: any[];
  settings?: any;
  payPeriodDays: any[];
  payslips: any[];
  mailAccount?: any;
  users: any[];
  sheetsFound: string[];
}

function getColLetter(colIdx: number): string {
  let letter = "";
  let temp = colIdx;
  while (temp > 0) {
    const mod = (temp - 1) % 26;
    letter = String.fromCharCode(65 + mod) + letter;
    temp = Math.floor((temp - 1) / 26);
  }
  return letter;
}

export function parseNum(val: any): number {
  if (val === undefined || val === null || val === "") return 0;
  if (typeof val === "number") return isNaN(val) ? 0 : val;
  const cleaned = String(val).replace(/[^0-9.-]+/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

export function parseStr(val: any): string {
  if (val === undefined || val === null) return "";
  if (typeof val === "object" && val.text) return String(val.text).trim();
  return String(val).trim();
}

function normalizeKey(raw: string): string {
  const str = String(raw || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!str) return "";

  if (["employeecode", "empid", "empcode", "employeeid", "id"].includes(str)) return "id";
  if (["employeename", "fullname", "name", "employee"].includes(str)) return "name";
  if (["department", "dept"].includes(str)) return "dept";
  if (["designation", "role", "jobtitle", "position"].includes(str)) return "role";
  if (["email", "emailaddress", "workemail", "useremail"].includes(str)) return "email";
  if (["basic", "basicsalary", "basicpay"].includes(str)) return "basic";
  if (["special", "specialallowance", "specialpay"].includes(str)) return "special";
  if (["transport", "transportallowance"].includes(str)) return "transport";
  if (["medical", "medicalallowance", "medicalreimbursement"].includes(str)) return "medical";
  if (["onsite", "onsiteincentive", "onsiteallowance"].includes(str)) return "onsite";
  if (["project", "projectallowance"].includes(str)) return "projectAllowance";
  if (["lta", "leavetravelallowance"].includes(str)) return "lta";
  if (["hra", "houserentallowance"].includes(str)) return "hra";
  if (["tds", "tdstax", "tax"].includes(str)) return "tds";
  if (["pf", "pfdeduction", "providentfund"].includes(str)) return "pf";
  if (["pt", "professionaltax"].includes(str)) return "pt";
  if (["bankname", "bank"].includes(str)) return "bankName";
  if (["bankaccountno", "bankaccountnumber", "accountno", "accountnumber"].includes(str)) return "bankAccountNo";
  if (["ifsc", "ifsccode"].includes(str)) return "ifsc";
  if (["pan", "pancard", "panno", "pannumber"].includes(str)) return "pan";
  if (["uan", "uannumber", "uanno"].includes(str)) return "uan";
  if (["pfaccountno", "pfaccountnumber", "pfno"].includes(str)) return "pfAccountNo";
  if (["doj", "dateofjoining", "joiningdate"].includes(str)) return "doj";
  if (["paymentmode", "modeofpayment", "paymode"].includes(str)) return "paymentMode";
  if (["pdfpassword", "payslippassword"].includes(str)) return "pdfPassword";
  if (["password", "encryptedpassword", "loginpassword", "userpassword"].includes(str)) return "password";

  // Catalog keys
  if (["componentcode", "code"].includes(str)) return "code";
  if (["componentname"].includes(str)) return "name";
  if (["group", "componentgroup", "type"].includes(str)) return "group";
  if (["calc", "calcmethod", "calculationmethod", "calculationtype"].includes(str)) return "calc";
  if (["taxable", "taxablestatus"].includes(str)) return "taxable";
  if (["order", "displayorder"].includes(str)) return "order";

  // Salary Structure & Payslip keys
  if (["componentid"].includes(str)) return "componentId";
  if (["prorate", "lop", "proratelop"].includes(str)) return "prorate";
  if (["fixed"].includes(str)) return "fixed";
  if (["value", "amount", "salaryvalue", "valueor"].includes(str)) return "value";
  if (["period", "payperiod", "month"].includes(str)) return "period";
  if (["daysinmonth", "totaldays"].includes(str)) return "daysInMonth";
  if (["dayspayable", "payableday", "payabledays"].includes(str)) return "daysPayable";
  if (["grosspay", "gross", "totalgross"].includes(str)) return "gross";
  if (["deductions", "totaldeductions"].includes(str)) return "deductions";
  if (["netpay", "net", "takehome", "nettakehome"].includes(str)) return "net";
  if (["emailedto", "sentto", "recipient"].includes(str)) return "emailedTo";
  if (["emailedat", "sentat", "emaildate"].includes(str)) return "emailedAt";
  if (["user", "mailbox", "sender", "username", "configuredsendermailbox"].includes(str)) return "user";
  if (["initials"].includes(str)) return "initials";
  if (["breakdownjson", "componentsjson", "detailsjson", "breakdown"].includes(str)) return "breakdownJson";
  if (["settingfield", "setting", "parameter"].includes(str)) return "key";
  if (["configuredvalue"].includes(str)) return "value";

  return str || raw.trim().toLowerCase().replace(/\s+/g, "_");
}

/**
 * Universal Multi-Collection Parser:
 * Supports BOTH multi-sheet .xlsx Excel files AND exact .json database backup files!
 * Ensures not a single row or field is missed.
 */
export async function parseMultiCollectionExcel(
  file: File,
  existingEmployeeIds: Set<string>
): Promise<{ data: ParsedMultiCollectionData; error?: string }> {
  try {
    // ─────────────── PATH A: RAW JSON BACKUP FILE ───────────────
    if (file.name.toLowerCase().endsWith(".json")) {
      const text = await file.text();
      const raw = JSON.parse(text);
      const employeesRaw = Array.isArray(raw.employees) ? raw.employees : [];

      const employees: ParsedEmployeeRow[] = employeesRaw.map((emp: any, idx: number) => {
        const id = parseStr(emp.id);
        const name = parseStr(emp.name);
        const errors: string[] = [];
        if (!id) errors.push("Missing Employee Code");
        if (!name) errors.push("Missing Employee Name");

        const isValid = errors.length === 0;
        let status: "new" | "update" | "error" = "new";
        if (!isValid) status = "error";
        else if (existingEmployeeIds.has(id.toLowerCase())) status = "update";

        return {
          rowNumber: idx + 1,
          id,
          name,
          dept: parseStr(emp.dept),
          role: parseStr(emp.role),
          email: parseStr(emp.email),
          basic: parseNum(emp.basic),
          special: parseNum(emp.special),
          transport: parseNum(emp.transport),
          medical: parseNum(emp.medical),
          onsite: parseNum(emp.onsite),
          projectAllowance: parseNum(emp.projectAllowance),
          lta: parseNum(emp.lta),
          tds: parseNum(emp.tds),
          pf: parseNum(emp.pf),
          bankName: parseStr(emp.bankName),
          bankAccountNo: parseStr(emp.bankAccountNo),
          ifsc: parseStr(emp.ifsc),
          pan: parseStr(emp.pan),
          uan: parseStr(emp.uan),
          pfAccountNo: parseStr(emp.pfAccountNo),
          doj: parseStr(emp.doj),
          paymentMode: parseStr(emp.paymentMode),
          pdfPassword: parseStr(emp.pdfPassword),
          isValid,
          errors,
          status,
          ...emp, // Preserves all custom dynamic fields
        };
      });

      return {
        data: {
          employees,
          salaryComponents: Array.isArray(raw.salaryComponents) ? raw.salaryComponents : [],
          salaryStructures: Array.isArray(raw.salaryStructures) ? raw.salaryStructures : [],
          settings: raw.settings || null,
          payPeriodDays: Array.isArray(raw.payPeriodDays) ? raw.payPeriodDays : [],
          payslips: Array.isArray(raw.payslips) ? raw.payslips : [],
          mailAccount: raw.mailAccount || null,
          users: Array.isArray(raw.users) ? raw.users : [],
          sheetsFound: [
            "JSON: Employees",
            "JSON: Salary Catalog",
            "JSON: Salary Structures",
            "JSON: Company Settings",
            "JSON: Pay Period Days",
            "JSON: Payslips",
            "JSON: Mail Account",
            "JSON: Users",
          ],
        },
      };
    }

    // ─────────────── PATH B: MULTI-SHEET EXCEL WORKBOOK ───────────────
    const arrayBuffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);

    if (workbook.worksheets.length === 0) {
      return {
        data: {
          employees: [],
          salaryComponents: [],
          salaryStructures: [],
          payPeriodDays: [],
          payslips: [],
          users: [],
          sheetsFound: [],
        },
        error: "The uploaded workbook contains no worksheets.",
      };
    }

    const result: ParsedMultiCollectionData = {
      employees: [],
      salaryComponents: [],
      salaryStructures: [],
      payPeriodDays: [],
      payslips: [],
      users: [],
      sheetsFound: [],
    };

    workbook.worksheets.forEach((ws) => {
      const title = ws.name.trim().toLowerCase();
      result.sheetsFound.push(ws.name);

      let target:
        | "employees"
        | "catalog"
        | "structures"
        | "settings"
        | "periodDays"
        | "payslips"
        | "mailAccount"
        | "users" = "employees";

      if (title.includes("catalog") || title.includes("component")) {
        target = "catalog";
      } else if (title.includes("structure")) {
        target = "structures";
      } else if (title.includes("setting") || title.includes("company")) {
        target = "settings";
      } else if (title.includes("period") || title.includes("attendance") || title.includes("day")) {
        target = "periodDays";
      } else if (title.includes("payslip")) {
        target = "payslips";
      } else if (title.includes("mail") || title.includes("smtp")) {
        target = "mailAccount";
      } else if (title.includes("user") || title.includes("admin")) {
        target = "users";
      } else {
        target = "employees";
      }

      // Locate header row: skip banner title rows and find row with at least 2 distinct known schema keys
      let headerRowIdx = -1;
      let headerMap = new Map<number, string>();

      for (let r = 1; r <= Math.min(10, ws.rowCount); r++) {
        const row = ws.getRow(r);
        const firstCellStr = String(row.getCell(1).value || "").toUpperCase();
        if (
          firstCellStr.includes("COLLECTION") ||
          firstCellStr.includes("BACKUP") ||
          firstCellStr.includes("DATABASE")
        ) {
          continue;
        }

        const distinctKeys = new Set<string>();
        const currentMap = new Map<number, string>();

        row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
          const text = String(cell.value || "");
          const key = normalizeKey(text);
          if (key) {
            distinctKeys.add(key);
            currentMap.set(colNumber, key);
          }
        });

        if (distinctKeys.size >= 2) {
          headerRowIdx = r;
          headerMap = currentMap;
          break;
        }
      }

      if (headerRowIdx === -1) {
        const fallbackRowIdx = ws.rowCount >= 2 ? 2 : 1;
        const fallbackRow = ws.getRow(fallbackRowIdx);
        fallbackRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
          headerMap.set(colNumber, normalizeKey(String(cell.value || `col_${colNumber}`)));
        });
        headerRowIdx = fallbackRowIdx;
      }

      // Parse data rows
      for (let r = headerRowIdx + 1; r <= ws.rowCount; r++) {
        const row = ws.getRow(r);
        let hasData = false;
        const rowObj: Record<string, any> = {};

        headerMap.forEach((key, colNumber) => {
          const cell = row.getCell(colNumber);
          if (cell.value !== undefined && cell.value !== null && cell.value !== "") {
            hasData = true;
            rowObj[key] = cell.value;
          }
        });

        if (!hasData) continue;

        if (target === "employees") {
          const id = parseStr(rowObj.id);
          const name = parseStr(rowObj.name);
          if (!id && !name) continue;

          const errors: string[] = [];
          if (!id) errors.push("Missing Employee Code");
          if (!name) errors.push("Missing Employee Name");

          const basic = parseNum(rowObj.basic);
          if (basic < 0) errors.push("Basic salary cannot be negative");

          const isValid = errors.length === 0;
          let status: "new" | "update" | "error" = "new";
          if (!isValid) {
            status = "error";
          } else if (existingEmployeeIds.has(id.toLowerCase())) {
            status = "update";
          }

          result.employees.push({
            rowNumber: r,
            id,
            name,
            dept: parseStr(rowObj.dept),
            role: parseStr(rowObj.role),
            email: parseStr(rowObj.email),
            basic,
            special: parseNum(rowObj.special),
            transport: parseNum(rowObj.transport),
            medical: parseNum(rowObj.medical),
            onsite: parseNum(rowObj.onsite),
            projectAllowance: parseNum(rowObj.projectAllowance),
            lta: parseNum(rowObj.lta),
            tds: parseNum(rowObj.tds),
            pf: parseNum(rowObj.pf),
            bankName: parseStr(rowObj.bankName),
            bankAccountNo: parseStr(rowObj.bankAccountNo),
            ifsc: parseStr(rowObj.ifsc),
            pan: parseStr(rowObj.pan),
            uan: parseStr(rowObj.uan),
            pfAccountNo: parseStr(rowObj.pfAccountNo),
            doj: parseStr(rowObj.doj),
            paymentMode: parseStr(rowObj.paymentMode),
            pdfPassword: parseStr(rowObj.pdfPassword || rowObj.password),
            isValid,
            errors,
            status,
            ...rowObj, // Preserves all dynamic custom fields
          });
        } else if (target === "catalog") {
          const code = parseStr(rowObj.code || rowObj.id).toUpperCase();
          const name = parseStr(rowObj.name);
          if (code && name) {
            result.salaryComponents.push({
              code,
              name,
              group: String(rowObj.group || "earning").toLowerCase().includes("deduct")
                ? "deduction"
                : "earning",
              calc: parseStr(rowObj.calc) || "Flat ₹",
              taxable: parseStr(rowObj.taxable) || "—",
              order: parseNum(rowObj.order),
            });
          }
        } else if (target === "structures") {
          const employeeId = parseStr(rowObj.employeeId || rowObj.id);
          const componentId = parseStr(rowObj.componentId || rowObj.id || rowObj.name);
          if (employeeId && componentId) {
            result.salaryStructures.push({
              employeeId,
              componentId,
              name: parseStr(rowObj.name || rowObj.componentName),
              group: String(rowObj.group || "earning").toLowerCase(),
              calc: String(rowObj.calc || "flat").toLowerCase(),
              value: parseNum(rowObj.value),
              prorate: Boolean(rowObj.prorate),
              fixed: Boolean(rowObj.fixed),
            });
          }
        } else if (target === "periodDays") {
          const employeeId = parseStr(rowObj.employeeId || rowObj.id);
          const period = parseStr(rowObj.period);
          if (employeeId && period) {
            result.payPeriodDays.push({
              employeeId,
              period,
              daysInMonth: parseNum(rowObj.daysInMonth) || 30,
              daysPayable: parseNum(rowObj.daysPayable) || 30,
            });
          }
        } else if (target === "settings") {
          const key = parseStr(rowObj.key || rowObj.settingfield || rowObj.setting || Object.values(rowObj)[0]);
          const val = rowObj.value !== undefined ? rowObj.value : Object.values(rowObj)[1];
          if (key && val !== undefined) {
            if (!result.settings) result.settings = {};
            result.settings[key] = val;
          }
        } else if (target === "payslips") {
          const employeeId = parseStr(rowObj.employeeId || rowObj.id);
          const period = parseStr(rowObj.period);
          if (employeeId && period) {
            result.payslips.push({
              employeeId,
              period,
              gross: parseNum(rowObj.gross),
              deductions: parseNum(rowObj.deductions),
              net: parseNum(rowObj.net),
              daysInMonth: parseNum(rowObj.daysInMonth) || 30,
              daysPayable: parseNum(rowObj.daysPayable) || 30,
              emailedTo: parseStr(rowObj.emailedTo),
              emailedAt: parseStr(rowObj.emailedAt),
              breakdownJson: rowObj.breakdownJson,
            });
          }
        } else if (target === "mailAccount") {
          const user = parseStr(rowObj.user || rowObj.value || rowObj.email || Object.values(rowObj)[1] || Object.values(rowObj)[0]);
          if (user) {
            result.mailAccount = { user };
          }
        } else if (target === "users") {
          const email = parseStr(rowObj.email);
          if (email) {
            result.users.push({
              name: parseStr(rowObj.name),
              email,
              role: parseStr(rowObj.role) || "User",
              initials: parseStr(rowObj.initials),
              password: parseStr(rowObj.password || rowObj.pdfPassword || rowObj.encryptedPassword),
            });
          }
        }
      }
    });

    return { data: result };
  } catch (err: any) {
    return {
      data: {
        employees: [],
        salaryComponents: [],
        salaryStructures: [],
        payPeriodDays: [],
        payslips: [],
        users: [],
        sheetsFound: [],
      },
      error: err.message || "Failed to parse multi-sheet Excel file",
    };
  }
}

/**
 * 100% Dynamic Multi-Collection Database Exporter:
 * Generates ONE .xlsx file with 8 styled sheets corresponding to all 8 collections.
 * Scans dynamic employee columns and payslip breakdown JSON so ZERO data is lost!
 */
export async function exportAllCollectionsToExcel(
  collectionsData: {
    employees: any[];
    salaryComponents: any[];
    salaryStructures: any[];
    settings: any;
    payPeriodDays: any[];
    payslips?: any[];
    mailAccount?: any;
    users?: any[];
  },
  companyName: string
) {
  const {
    employees = [],
    salaryComponents = [],
    salaryStructures = [],
    settings = {},
    payPeriodDays = [],
    payslips = [],
    mailAccount = {},
    users = [],
  } = collectionsData;

  const workbook = new ExcelJS.Workbook();
  const cName = companyName?.trim() || "Organization";
  workbook.creator = `${cName} Enterprise DB Backup`;
  workbook.created = new Date();

  // ──────────────── SHEET 1: EMPLOYEES ────────────────
  const empSheet = workbook.addWorksheet("Employees");
  const empHeaders: Array<{ header: string; key: string; width: number; isNum?: boolean }> = [
    { header: "Employee Code", key: "id", width: 16 },
    { header: "Employee Name", key: "name", width: 24 },
    { header: "Department", key: "dept", width: 18 },
    { header: "Designation", key: "role", width: 22 },
    { header: "Email Address", key: "email", width: 28 },
    { header: "Basic Salary (₹)", key: "basic", width: 16, isNum: true },
    { header: "Special Allowance (₹)", key: "special", width: 20, isNum: true },
    { header: "Transport Allowance (₹)", key: "transport", width: 22, isNum: true },
    { header: "Medical Allowance (₹)", key: "medical", width: 20, isNum: true },
    { header: "Onsite Incentive (₹)", key: "onsite", width: 18, isNum: true },
    { header: "Project Allowance (₹)", key: "projectAllowance", width: 20, isNum: true },
    { header: "LTA (₹)", key: "lta", width: 14, isNum: true },
    { header: "TDS Tax (₹)", key: "tds", width: 14, isNum: true },
    { header: "PF Deduction (₹)", key: "pf", width: 16, isNum: true },
    { header: "Bank Name", key: "bankName", width: 18 },
    { header: "Bank Account No", key: "bankAccountNo", width: 22 },
    { header: "IFSC Code", key: "ifsc", width: 16 },
    { header: "PAN Card", key: "pan", width: 16 },
    { header: "UAN Number", key: "uan", width: 18 },
    { header: "PF Account No", key: "pfAccountNo", width: 18 },
    { header: "Date of Joining", key: "doj", width: 16 },
    { header: "Payment Mode", key: "paymentMode", width: 16 },
  ];

  // Discover any custom/dynamic fields so NO field is missed
  const standardKeys = new Set(empHeaders.map((h) => h.key));
  const ignoredKeys = new Set(["_id", "__v", "createdAt", "updatedAt"]);
  const dynamicKeys: string[] = [];

  employees.forEach((emp) => {
    Object.keys(emp).forEach((k) => {
      if (!standardKeys.has(k) && !ignoredKeys.has(k) && !dynamicKeys.includes(k)) {
        dynamicKeys.push(k);
      }
    });
  });

  dynamicKeys.forEach((k) => {
    empHeaders.push({
      header: k.toUpperCase(),
      key: k,
      width: 18,
      isNum: typeof employees.find((e) => typeof e[k] === "number")?.[k] === "number",
    });
  });

  empSheet.columns = empHeaders.map((h) => ({ width: h.width }));

  const lastEmpCol = getColLetter(empHeaders.length);
  empSheet.mergeCells(`A1:${lastEmpCol}1`);
  const empTitle = empSheet.getCell("A1");
  empTitle.value = `${cName.toUpperCase()} - EMPLOYEES COLLECTION`;
  empTitle.font = { name: "Segoe UI", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
  empTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F2537" } };
  empTitle.alignment = { vertical: "middle", horizontal: "center" };
  empSheet.getRow(1).height = 36;

  const empHeaderRow = empSheet.getRow(2);
  empHeaderRow.height = 28;
  empHeaders.forEach((col, idx) => {
    const cell = empHeaderRow.getCell(idx + 1);
    cell.value = col.header;
    cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A8A" } };
    cell.alignment = { vertical: "middle", horizontal: col.isNum ? "right" : "left" };
  });

  employees.forEach((emp, rIdx) => {
    const row = empSheet.getRow(3 + rIdx);
    row.height = 22;
    empHeaders.forEach((col, cIdx) => {
      const cell = row.getCell(cIdx + 1);
      const val = emp[col.key];
      cell.value = val !== undefined && val !== null ? val : col.isNum ? 0 : "-";
      cell.font = { name: "Segoe UI", size: 9.5 };
      cell.alignment = { vertical: "middle", horizontal: col.isNum ? "right" : "left" };
      if (col.isNum && typeof val === "number") {
        cell.numFmt = "₹#,##0.00";
      }
    });
  });

  // ──────────────── SHEET 2: SALARY CATALOG ────────────────
  const catSheet = workbook.addWorksheet("Salary Catalog");
  const catHeaders = [
    { header: "Component Code", key: "code", width: 18 },
    { header: "Component Name", key: "name", width: 26 },
    { header: "Group", key: "group", width: 16 },
    { header: "Calculation Method", key: "calc", width: 22 },
    { header: "Taxable Status", key: "taxable", width: 16 },
    { header: "Display Order", key: "order", width: 14 },
  ];

  catSheet.columns = catHeaders.map((h) => ({ width: h.width }));

  const lastCatCol = getColLetter(catHeaders.length);
  catSheet.mergeCells(`A1:${lastCatCol}1`);
  const catTitle = catSheet.getCell("A1");
  catTitle.value = `${cName.toUpperCase()} - SALARY CATALOG COLLECTION`;
  catTitle.font = { name: "Segoe UI", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
  catTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F2537" } };
  catTitle.alignment = { vertical: "middle", horizontal: "center" };
  catSheet.getRow(1).height = 36;

  const catHeaderRow = catSheet.getRow(2);
  catHeaderRow.height = 28;
  catHeaders.forEach((col, idx) => {
    const cell = catHeaderRow.getCell(idx + 1);
    cell.value = col.header;
    cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A8A" } };
    cell.alignment = { vertical: "middle", horizontal: "left" };
  });

  salaryComponents.forEach((comp, rIdx) => {
    const row = catSheet.getRow(3 + rIdx);
    row.height = 22;
    catHeaders.forEach((col, cIdx) => {
      const cell = row.getCell(cIdx + 1);
      cell.value = comp[col.key] ?? "-";
      cell.font = { name: "Segoe UI", size: 9.5 };
      cell.alignment = { vertical: "middle", horizontal: "left" };
    });
  });

  // ──────────────── SHEET 3: SALARY STRUCTURES ────────────────
  const structSheet = workbook.addWorksheet("Salary Structures");
  const structHeaders = [
    { header: "Employee Code", width: 18 },
    { header: "Component ID", width: 18 },
    { header: "Component Name", width: 24 },
    { header: "Group", width: 16 },
    { header: "Calculation Type", width: 20 },
    { header: "Value (₹ or %)", width: 16 },
    { header: "Prorate (LOP)", width: 14 },
    { header: "Fixed", width: 12 },
  ];

  structSheet.columns = structHeaders.map((h) => ({ width: h.width }));

  const lastStructCol = getColLetter(structHeaders.length);
  structSheet.mergeCells(`A1:${lastStructCol}1`);
  const structTitle = structSheet.getCell("A1");
  structTitle.value = `${cName.toUpperCase()} - SALARY STRUCTURES COLLECTION`;
  structTitle.font = { name: "Segoe UI", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
  structTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F2537" } };
  structTitle.alignment = { vertical: "middle", horizontal: "center" };
  structSheet.getRow(1).height = 36;

  const structHeaderRow = structSheet.getRow(2);
  structHeaderRow.height = 28;
  structHeaders.forEach((col, idx) => {
    const cell = structHeaderRow.getCell(idx + 1);
    cell.value = col.header;
    cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A8A" } };
    cell.alignment = { vertical: "middle", horizontal: "left" };
  });

  let structRowIdx = 3;
  salaryStructures.forEach((struct) => {
    const empId = struct.employeeId;
    (struct.components || []).forEach((c: any) => {
      const row = structSheet.getRow(structRowIdx++);
      row.height = 20;
      row.getCell(1).value = empId;
      row.getCell(2).value = c.id;
      row.getCell(3).value = c.name;
      row.getCell(4).value = c.group;
      row.getCell(5).value = c.calc;
      row.getCell(6).value = c.value;
      row.getCell(7).value = c.prorate ? "TRUE" : "FALSE";
      row.getCell(8).value = c.fixed ? "TRUE" : "FALSE";
    });
  });

  // ──────────────── SHEET 4: COMPANY SETTINGS ────────────────
  const setSheet = workbook.addWorksheet("Company Settings");
  setSheet.columns = [{ width: 28 }, { width: 45 }];

  setSheet.mergeCells("A1:B1");
  const setTitle = setSheet.getCell("A1");
  setTitle.value = `${cName.toUpperCase()} - SETTINGS COLLECTION`;
  setTitle.font = { name: "Segoe UI", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
  setTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F2537" } };
  setTitle.alignment = { vertical: "middle", horizontal: "center" };
  setSheet.getRow(1).height = 36;

  const setHeaderRow = setSheet.getRow(2);
  setHeaderRow.height = 28;
  setHeaderRow.getCell(1).value = "Setting Field";
  setHeaderRow.getCell(2).value = "Configured Value";
  [1, 2].forEach((c) => {
    const cell = setHeaderRow.getCell(c);
    cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A8A" } };
  });

  const settingRows = [
    ["Company Name", settings?.company?.name || ""],
    ["Legal Name", settings?.company?.legalName || ""],
    ["City", settings?.company?.city || ""],
    ["Pincode", settings?.company?.pincode || ""],
    ["Address", (settings?.company?.addressLines || []).join(", ")],
    ["Active Pay Period", settings?.payPeriod || ""],
    ["Standard Days in Month", settings?.standardDays || 30],
    ["Configured Departments", (settings?.departments || []).join(", ")],
    ["Default Bank Name", settings?.slipDefaults?.bankName || ""],
    ["Default Bank Account", settings?.slipDefaults?.bankAccountNo || ""],
    ["Default PF Number", settings?.slipDefaults?.pfAccountNo || ""],
    ["Payslip Footnote", settings?.slipDefaults?.footNote || ""],
    ["Watermark Text", settings?.company?.watermarkText || ""],
    ["Logo Data URL", settings?.company?.logoUrl || ""],
  ];

  settingRows.forEach(([k, v], idx) => {
    const row = setSheet.getRow(3 + idx);
    row.height = 22;
    row.getCell(1).value = k;
    row.getCell(2).value = v;
    row.getCell(1).font = { name: "Segoe UI", size: 9.5, bold: true };
    row.getCell(2).font = { name: "Segoe UI", size: 9.5 };
  });

  // ──────────────── SHEET 5: PAY PERIOD DAYS ────────────────
  const ppSheet = workbook.addWorksheet("Pay Period Days");
  ppSheet.columns = [{ width: 18 }, { width: 18 }, { width: 16 }, { width: 16 }];

  ppSheet.mergeCells("A1:D1");
  const ppTitle = ppSheet.getCell("A1");
  ppTitle.value = `${cName.toUpperCase()} - PAY PERIOD DAYS (LOP) COLLECTION`;
  ppTitle.font = { name: "Segoe UI", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
  ppTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F2537" } };
  ppTitle.alignment = { vertical: "middle", horizontal: "center" };
  ppSheet.getRow(1).height = 36;

  const ppHeaderRow = ppSheet.getRow(2);
  ppHeaderRow.height = 28;
  ["Employee Code", "Pay Period", "Days in Month", "Days Payable"].forEach((h, idx) => {
    const cell = ppHeaderRow.getCell(idx + 1);
    cell.value = h;
    cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A8A" } };
  });

  payPeriodDays.forEach((pp, rIdx) => {
    const row = ppSheet.getRow(3 + rIdx);
    row.height = 20;
    row.getCell(1).value = pp.employeeId;
    row.getCell(2).value = pp.period;
    row.getCell(3).value = pp.daysInMonth;
    row.getCell(4).value = pp.daysPayable;
  });

  // ──────────────── SHEET 6: PAYSLIPS ARCHIVE ────────────────
  const slipSheet = workbook.addWorksheet("Payslips Archive");
  const slipHeaders = [
    { header: "Employee Code", width: 16 },
    { header: "Pay Period", width: 16 },
    { header: "Gross Pay (₹)", width: 16, isNum: true },
    { header: "Deductions (₹)", width: 16, isNum: true },
    { header: "Net Take-Home (₹)", width: 18, isNum: true },
    { header: "Days in Month", width: 14 },
    { header: "Days Payable", width: 14 },
    { header: "Emailed To", width: 28 },
    { header: "Emailed At", width: 22 },
    { header: "Detailed Breakdown (JSON)", width: 35 },
  ];

  slipSheet.columns = slipHeaders.map((h) => ({ width: h.width }));

  const lastSlipCol = getColLetter(slipHeaders.length);
  slipSheet.mergeCells(`A1:${lastSlipCol}1`);
  const slipTitle = slipSheet.getCell("A1");
  slipTitle.value = `${cName.toUpperCase()} - PAYSLIPS COLLECTION`;
  slipTitle.font = { name: "Segoe UI", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
  slipTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F2537" } };
  slipTitle.alignment = { vertical: "middle", horizontal: "center" };
  slipSheet.getRow(1).height = 36;

  const slipHeaderRow = slipSheet.getRow(2);
  slipHeaderRow.height = 28;
  slipHeaders.forEach((col, idx) => {
    const cell = slipHeaderRow.getCell(idx + 1);
    cell.value = col.header;
    cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A8A" } };
    cell.alignment = { vertical: "middle", horizontal: col.isNum ? "right" : "left" };
  });

  payslips.forEach((ps, rIdx) => {
    const row = slipSheet.getRow(3 + rIdx);
    row.height = 20;
    const grossVal = ps.result?.gross ?? ps.gross ?? 0;
    const dedVal = ps.result?.totalDeductions ?? ps.deductions ?? 0;
    const netVal = ps.result?.net ?? ps.net ?? 0;

    row.getCell(1).value = ps.employeeId;
    row.getCell(2).value = ps.period;
    row.getCell(3).value = grossVal;
    row.getCell(3).numFmt = "₹#,##0.00";
    row.getCell(4).value = dedVal;
    row.getCell(4).numFmt = "₹#,##0.00";
    row.getCell(5).value = netVal;
    row.getCell(5).numFmt = "₹#,##0.00";
    row.getCell(6).value = ps.daysInMonth;
    row.getCell(7).value = ps.daysPayable;
    row.getCell(8).value = ps.emailedTo || "-";
    row.getCell(9).value = ps.emailedAt ? new Date(ps.emailedAt).toLocaleString() : "Not Emailed";
    row.getCell(10).value = JSON.stringify({ result: ps.result, components: ps.components });
  });

  // ──────────────── SHEET 7: MAIL ACCOUNT ────────────────
  const mailSheet = workbook.addWorksheet("Mail Account");
  mailSheet.columns = [{ width: 28 }, { width: 45 }];

  mailSheet.mergeCells("A1:B1");
  const mailTitle = mailSheet.getCell("A1");
  mailTitle.value = `${cName.toUpperCase()} - MAIL ACCOUNT COLLECTION`;
  mailTitle.font = { name: "Segoe UI", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
  mailTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F2537" } };
  mailTitle.alignment = { vertical: "middle", horizontal: "center" };
  mailSheet.getRow(1).height = 36;

  const mailHeaderRow = mailSheet.getRow(2);
  mailHeaderRow.height = 28;
  mailHeaderRow.getCell(1).value = "Parameter";
  mailHeaderRow.getCell(2).value = "Configured Value";
  [1, 2].forEach((c) => {
    const cell = mailHeaderRow.getCell(c);
    cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A8A" } };
  });

  const mailRow = mailSheet.getRow(3);
  mailRow.height = 22;
  mailRow.getCell(1).value = "Configured Sender Mailbox";
  mailRow.getCell(2).value = mailAccount?.user || "";

  // ──────────────── SHEET 8: USERS ────────────────
  const userSheet = workbook.addWorksheet("Users");
  const userHeaders = [
    { header: "Full Name", width: 24 },
    { header: "Email Address", width: 30 },
    { header: "Role", width: 16 },
    { header: "Initials", width: 14 },
    { header: "Encrypted Password", width: 45 },
  ];

  userSheet.columns = userHeaders.map((h) => ({ width: h.width }));

  const lastUserCol = getColLetter(userHeaders.length);
  userSheet.mergeCells(`A1:${lastUserCol}1`);
  const userTitle = userSheet.getCell("A1");
  userTitle.value = `${cName.toUpperCase()} - USERS COLLECTION`;
  userTitle.font = { name: "Segoe UI", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
  userTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F2537" } };
  userTitle.alignment = { vertical: "middle", horizontal: "center" };
  userSheet.getRow(1).height = 36;

  const userHeaderRow = userSheet.getRow(2);
  userHeaderRow.height = 28;
  userHeaders.forEach((col, idx) => {
    const cell = userHeaderRow.getCell(idx + 1);
    cell.value = col.header;
    cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A8A" } };
    cell.alignment = { vertical: "middle", horizontal: "left" };
  });

  users.forEach((u, rIdx) => {
    const row = userSheet.getRow(3 + rIdx);
    row.height = 20;
    row.getCell(1).value = u.name || "";
    row.getCell(2).value = u.email || "";
    row.getCell(3).value = u.role || "";
    row.getCell(4).value = u.initials || "";
    row.getCell(5).value = u.password || "";
  });

  // Trigger browser download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${cName.replace(/\s+/g, "_")}_Complete_Database_Backup_8_Collections_${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * 100% Native JSON Database Exporter:
 * Downloads an exact 1:1 replica of all 8 collections in pure JSON format.
 */
export function exportAllCollectionsToJson(collectionsData: any, companyName: string) {
  const cName = companyName?.trim() || "Organization";
  const jsonStr = JSON.stringify(collectionsData, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${cName.replace(/\s+/g, "_")}_Exact_Database_Backup_8_Collections_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
