import PDFDocument from "pdfkit";
import fs from "node:fs";
import path from "node:path";

const currentDir = typeof __dirname !== "undefined" ? __dirname : path.resolve("src/lib");

const DEFAULT_COMMIT_LOGO_BASE64 =
  "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";

function getLogoSource(companyLogo) {
  if (companyLogo && typeof companyLogo === "string" && companyLogo.trim()) {
    if (companyLogo.startsWith("data:image/")) {
      try {
        const base64Data = companyLogo.replace(/^data:image\/\w+;base64,/, "");
        return Buffer.from(base64Data, "base64");
      } catch {}
    }
    try {
      if (fs.existsSync(companyLogo)) {
        return companyLogo;
      }
    } catch {}
  }
  
  const possiblePaths = [
    path.join(currentDir, "../assets/COMM-IT.png"),
    path.join(currentDir, "../assets/logo.png"),
    path.join(currentDir, "../../assets/COMM-IT.png"),
    path.resolve("src/assets/COMM-IT.png"),
    path.resolve("src/assets/logo.png"),
    path.resolve("assets/COMM-IT.png"),
    path.resolve("dist/assets/COMM-IT.png"),
    path.resolve("../SalarySlip/src/assets/COMM-IT.png"),
    path.resolve("../Backend/src/assets/COMM-IT.png"),
    path.join(process.cwd(), "src/assets/COMM-IT.png"),
    path.join(process.cwd(), "assets/COMM-IT.png"),
    path.join(process.cwd(), "Backend/src/assets/COMM-IT.png"),
  ];

  for (const p of possiblePaths) {
    try {
      if (fs.existsSync(p)) return p;
    } catch {}
  }

  // Fallback to embedded COMM-IT logo buffer for built apps (Tauri, Node, etc.)
  return Buffer.from(DEFAULT_COMMIT_LOGO_BASE64, "base64");
}

function safeNum(val) {
  if (typeof val === "number" && !isNaN(val)) return val;
  if (typeof val === "string") {
    const p = parseFloat(val.replace(/,/g, ""));
    if (!isNaN(p)) return p;
  }
  return 0;
}

function formatMoney(val) {
  return safeNum(val).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function createPayslipPdfBuffer({
  employeeId,
  employeeName,
  dept,
  role,
  period,
  companyName,
  companyAddress,
  companyLogo,
  watermarkText,
  netPay,
  pan,
  uan,
  doj,
  bankName,
  bankAccountNo,
  pfAccountNo,
  earnings = [],
  deductions = [],
  gross = 0,
  totalDeductions = 0,
  net = 0,
}) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 30, size: "A4" });
      const buffers = [];

      doc.on("data", (chunk) => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", (err) => reject(err));

      const darkColor = "#111111";

      // Background Text Watermark ("COMM-IT") centered behind table
      const wmText = watermarkText !== undefined ? watermarkText : (companyName || "COMM-IT");
      if (wmText) {
        doc.save();
        doc.rotate(-30, { origin: [297, 260] });
        doc.fillColor("#000000").fillOpacity(0.07).fontSize(75).font("Helvetica-Bold");
        doc.text(wmText, 97, 235, { width: 400, align: "center" });
        doc.restore();
      }

      // Top Outer Header Box (30, 30 to 565, 117)
      doc.rect(30, 30, 535, 87).strokeColor("#333333").lineWidth(1).stroke();

      // Vertical Divider Line separating Logo Cell from Right Section (at x = 150)
      doc.moveTo(150, 30).lineTo(150, 117).stroke();

      // Left Logo Cell (x = 30 to 150, y = 30 to 117)
      const logoSource = getLogoSource(companyLogo);
      if (logoSource) {
        try {
          doc.image(logoSource, 35, 45, { fit: [110, 57], align: "center", valign: "center" });
        } catch (imgErr) {
          console.error("[PDF GENERATOR LOGO ERROR]:", imgErr?.stack || imgErr);
          doc.fillColor("#0078D4").fontSize(18).font("Helvetica-Bold").text("COMM-IT", 45, 55);
          doc.fillColor("#666666").fontSize(7).font("Helvetica").text("commitment to quality", 45, 76);
        }
      } else {
        doc.fillColor("#0078D4").fontSize(18).font("Helvetica-Bold").text("COMM-IT", 45, 55);
        doc.fillColor("#666666").fontSize(7).font("Helvetica").text("commitment to quality", 45, 76);
      }

      // Horizontal Divider Line separating Company Info from Pay Slip Banner (at y = 93)
      doc.moveTo(150, 93).lineTo(565, 93).stroke();

      // Top Right Section: Company Legal Name & Address
      doc.fillColor(darkColor).fontSize(10.5).font("Helvetica-Bold").text(companyName || "COMM-IT INDIA PVT. LTD.", 160, 38);
      doc.fillColor("#444444").fontSize(8.5).font("Helvetica").text(
        companyAddress || "S-113, First Floor, Salcon Aurum, Jasola District Centre\nOpposite Omax Square, New Delhi 110025",
        160,
        52
      );

      // Bottom Right Section: Pay Slip Banner (y = 93 to 117)
      doc.rect(150, 93, 415, 24).fillAndStroke("#F9FAFB", "#333333");
      doc.fillColor(darkColor).fontSize(10.5).font("Helvetica-Bold").text(`Pay Slip - ${period || 'Jul 2026'}`, 150, 100, { width: 415, align: "center" });

      // Employee Metadata Table Grid (starts at y = 117)
      const startY = 117;
      const rowH = 18;

      const metaFields = [
        ["Employee Name", employeeName || "Dawood", "Designation", role || "Junir"],
        ["Employee Code", employeeId || "C11027", "Bank Name", bankName || "BUNB"],
        ["Department", dept || "IT", "Bank Account No.", bankAccountNo || "500977255349"],
        ["Date of Joining", doj || "01-Jan-2024", "PF Account No.", pfAccountNo || "4322"],
        ["PAN Number", pan || "ABCDE1234F", "UAN Number", uan || "101234567890"],
        ["Days in Month", "30", "Days Payable", "30"],
      ];

      const metaTotalH = metaFields.length * rowH;

      // Draw horizontal rows and text
      metaFields.forEach((row, i) => {
        const y = startY + i * rowH;
        doc.rect(30, y, 535, rowH).strokeColor("#333333").lineWidth(0.5).stroke();
        doc.fillColor("#444444").fontSize(8.5).font("Helvetica").text(row[0], 35, y + 4);
        doc.fillColor(darkColor).fontSize(8.5).font("Helvetica-Bold").text(row[1], 155, y + 4);
        doc.fillColor("#444444").fontSize(8.5).font("Helvetica").text(row[2], 305, y + 4);
        doc.fillColor(darkColor).fontSize(8.5).font("Helvetica-Bold").text(row[3], 425, y + 4);
      });

      // Vertical Grid Lines for Metadata Table
      doc.moveTo(150, startY).lineTo(150, startY + metaTotalH).stroke();
      doc.moveTo(300, startY).lineTo(300, startY + metaTotalH).stroke();
      doc.moveTo(420, startY).lineTo(420, startY + metaTotalH).stroke();

      // COMPONENTS Section Banner
      const compY = startY + metaTotalH;
      doc.rect(30, compY, 535, 20).fillAndStroke("#E5E7EB", "#333333");
      doc.fillColor(darkColor).fontSize(10).font("Helvetica-Bold").text("COMPONENTS", 30, compY + 5, { align: "center" });

      // Table Header Row: Earnings | Amount (In Rs.) | Deductions | Amount (In Rs.)
      const headerY = compY + 20;
      doc.rect(30, headerY, 535, 20).fillAndStroke("#F9FAFB", "#333333");
      doc.fillColor(darkColor).fontSize(8.5).font("Helvetica-Bold");
      doc.text("Earnings", 35, headerY + 5);
      doc.text("Amount (In Rs.)", 175, headerY + 5, { width: 100, align: "right" });
      doc.text("Deductions", 290, headerY + 5);
      doc.text("Amount (In Rs.)", 440, headerY + 5, { width: 115, align: "right" });

      // Fallback default rows if arrays are empty
      const defaultEarnings = [
        { name: "Basic Salary", amount: 10000 },
        { name: "HRA", amount: 0 },
        { name: "Onsite Incentive", amount: 0 },
        { name: "Medical Reimbursement", amount: 0 },
        { name: "New earning", amount: 0 },
      ];
      const defaultDeductions = [
        { name: "TDS", amount: 1500 },
      ];

      const eList = Array.isArray(earnings) && earnings.length ? earnings.filter(item => item && item.name) : defaultEarnings;
      const dList = Array.isArray(deductions) && deductions.length ? deductions.filter(item => item && item.name) : defaultDeductions;
      const rowCount = Math.max(eList.length, dList.length, 5);

      let tableY = headerY + 20;

      for (let i = 0; i < rowCount; i++) {
        const y = tableY + i * rowH;
        doc.rect(30, y, 535, rowH).strokeColor("#333333").lineWidth(0.5).stroke();

        const e = eList[i];
        const d = dList[i];

        if (e) {
          doc.fillColor(darkColor).fontSize(8.5).font("Helvetica").text(e.name, 35, y + 4);
          doc.fillColor(darkColor).fontSize(8.5).font("Helvetica").text(formatMoney(e.amount), 175, y + 4, { width: 100, align: "right" });
        }
        if (d) {
          doc.fillColor(darkColor).fontSize(8.5).font("Helvetica").text(d.name, 290, y + 4);
          doc.fillColor(darkColor).fontSize(8.5).font("Helvetica").text(formatMoney(d.amount), 440, y + 4, { width: 115, align: "right" });
        }
      }

      // Vertical Grid Lines for Components Table (Header + Component Rows)
      const compRowsH = rowCount * rowH + 20;
      doc.moveTo(280, headerY).lineTo(280, headerY + compRowsH).stroke();
      doc.moveTo(435, headerY).lineTo(435, headerY + compRowsH).stroke();

      // Totals Rows: Total Earnings (A) & Total Deductions (B) & Net Salary
      const totalGross = safeNum(gross) || 10000;
      const totalDed = safeNum(totalDeductions) || 1500;
      const netVal = safeNum(net) || safeNum(netPay) || (totalGross - totalDed);

      let totalsY = tableY + rowCount * rowH;

      // Row: Total Earnings (A)
      doc.rect(30, totalsY, 535, rowH).strokeColor("#333333").lineWidth(0.5).stroke();
      doc.fillColor(darkColor).fontSize(8.5).font("Helvetica-Bold").text("Total Earnings (A)", 35, totalsY + 4);
      doc.fillColor(darkColor).fontSize(8.5).font("Helvetica-Bold").text(formatMoney(totalGross), 175, totalsY + 4, { width: 100, align: "right" });
      doc.moveTo(280, totalsY).lineTo(280, totalsY + rowH).stroke();

      totalsY += rowH;
      // Row: Total Deductions (B)
      doc.rect(30, totalsY, 535, rowH).strokeColor("#333333").lineWidth(0.5).stroke();
      doc.fillColor(darkColor).fontSize(8.5).font("Helvetica-Bold").text("Total Deductions (B)", 290, totalsY + 4);
      doc.fillColor(darkColor).fontSize(8.5).font("Helvetica-Bold").text(formatMoney(totalDed), 440, totalsY + 4, { width: 115, align: "right" });
      doc.moveTo(435, totalsY).lineTo(435, totalsY + rowH).stroke();

      totalsY += rowH;
      // Row: Net Salary
      doc.rect(30, totalsY, 535, rowH).strokeColor("#333333").lineWidth(0.5).stroke();
      doc.fillColor(darkColor).fontSize(9).font("Helvetica-Bold").text("Net Salary", 290, totalsY + 4);
      doc.fillColor(darkColor).fontSize(9).font("Helvetica-Bold").text(formatMoney(netVal), 440, totalsY + 4, { width: 115, align: "right" });
      doc.moveTo(435, totalsY).lineTo(435, totalsY + rowH).stroke();

      // Footnote at bottom
      doc.fillColor("#444444").fontSize(8).font("Helvetica").text("This is a computer generated salary slip and does not require signature", 30, totalsY + 25);

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
