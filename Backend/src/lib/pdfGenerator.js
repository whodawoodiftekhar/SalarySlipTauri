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

function numberToWords(amount) {
  const n = Math.abs(safeNum(amount));
  if (n === 0) return "Rupees Zero Only";

  const units = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const convertBelowThousand = (numVal) => {
    let str = "";
    if (numVal >= 100) {
      str += units[Math.floor(numVal / 100)] + " Hundred";
      numVal %= 100;
      if (numVal > 0) str += " ";
    }
    if (numVal > 0) {
      if (numVal < 20) {
        str += units[numVal];
      } else {
        str += tens[Math.floor(numVal / 10)];
        if (numVal % 10 > 0) str += " " + units[numVal % 10];
      }
    }
    return str;
  };

  const rupeesInt = Math.floor(n);
  const paiseInt = Math.round((n - rupeesInt) * 100);

  let rupeeStr = "";
  let tempRupees = rupeesInt;

  if (tempRupees >= 10000000) {
    rupeeStr += convertBelowThousand(Math.floor(tempRupees / 10000000)) + " Crore ";
    tempRupees %= 10000000;
  }
  if (tempRupees >= 100000) {
    rupeeStr += convertBelowThousand(Math.floor(tempRupees / 100000)) + " Lakh ";
    tempRupees %= 100000;
  }
  if (tempRupees >= 1000) {
    rupeeStr += convertBelowThousand(Math.floor(tempRupees / 1000)) + " Thousand ";
    tempRupees %= 1000;
  }
  if (tempRupees > 0) {
    rupeeStr += convertBelowThousand(tempRupees);
  }

  rupeeStr = rupeeStr.trim();
  let result = rupeeStr ? `Rupees ${rupeeStr}` : "Rupees Zero";
  if (paiseInt > 0) {
    result += ` and ${convertBelowThousand(paiseInt)} Paise`;
  }
  result += " Only";

  return result;
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
  ifsc,
  earnings = [],
  deductions = [],
  gross = 0,
  totalDeductions = 0,
  net = 0,
  // rendered in the metadata table as "Days Payable"; both were referenced
  // there without ever being accepted as parameters, which threw a
  // ReferenceError on every single call
  daysInMonth = 30,
  daysPayable = 30,
  pdfPassword = "",
}) {
  return new Promise((resolve, reject) => {
    try {
      /**
       * Encryption is opt-in per employee: with no password on record the
       * document is written exactly as it always was, so existing employees and
       * every already-issued slip are unaffected.
       *
       * `userPassword` is what the employee types to open it. `ownerPassword` is
       * a separate secret so the permissions below cannot simply be stripped —
       * reusing the user password there would let anyone who can open the file
       * also lift the restrictions.
       *
       * `pdfVersion` picks the cipher, and pdfkit only understands a fixed set:
       * "1.4"/"1.5" give RC4-128, "1.6"/"1.7" give AES-128, "1.7ext3" gives
       * AES-256. Anything else — including a plausible-looking "2.0" — hits the
       * `default` branch of its switch and silently produces RC4-40, the weakest
       * option there is, with no error. So this string is load-bearing: verify
       * the /Encrypt dictionary if you ever change it.
       *
       * "1.7ext3" is the strongest pdfkit 0.19 can do. It is AES-256 at revision
       * 5; the stronger revision 6 from ISO 32000-2 is not implemented here.
       */
      const encryption = pdfPassword
        ? {
            userPassword: pdfPassword,
            ownerPassword: `${pdfPassword}::owner`,
            pdfVersion: "1.7ext3",
            permissions: { printing: "highResolution", copying: false, modifying: false },
          }
        : {};

      const doc = new PDFDocument({ margin: 30, size: "A4", ...encryption });

      let fontRegular = "Helvetica";
      let fontBold = "Helvetica-Bold";

      const candidateFonts = [
        { regular: "C:/Windows/Fonts/arial.ttf", bold: "C:/Windows/Fonts/arialbd.ttf" },
        { regular: "C:/Windows/Fonts/calibri.ttf", bold: "C:/Windows/Fonts/calibrib.ttf" },
        { regular: "C:/Windows/Fonts/segoeui.ttf", bold: "C:/Windows/Fonts/segoeuib.ttf" },
      ];

      for (const cf of candidateFonts) {
        try {
          if (fs.existsSync(cf.regular) && fs.existsSync(cf.bold)) {
            doc.registerFont("AppFont", cf.regular);
            doc.registerFont("AppFont-Bold", cf.bold);
            fontRegular = "AppFont";
            fontBold = "AppFont-Bold";
            break;
          }
        } catch {}
      }

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
        doc.fillColor("#000000").fillOpacity(0.07).fontSize(75).font(fontBold);
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
          doc.fillColor("#0078D4").fontSize(18).font(fontBold).text("COMM-IT", 45, 55);
          doc.fillColor("#666666").fontSize(7).font(fontRegular).text("commitment to quality", 45, 76);
        }
      } else {
        doc.fillColor("#0078D4").fontSize(18).font(fontBold).text("COMM-IT", 45, 55);
        doc.fillColor("#666666").fontSize(7).font(fontRegular).text("commitment to quality", 45, 76);
      }

      // Horizontal Divider Line separating Company Info from Pay Slip Banner (at y = 93)
      doc.moveTo(150, 93).lineTo(565, 93).stroke();

      // Top Right Section: Company Legal Name & Address
      doc.fillColor(darkColor).fontSize(10.5).font(fontBold).text(companyName || "COMM-IT INDIA PVT. LTD.", 160, 38);
      const formattedAddress = Array.isArray(companyAddress)
        ? companyAddress.filter(Boolean).join("\n")
        : (companyAddress || "S-113, First Floor, Salcon Aurum, Jasola District Centre\nOpposite Omax Square, New Delhi 110025");
      doc.fillColor("#444444").fontSize(8.5).font(fontRegular).text(
        formattedAddress,
        160,
        52
      );

      // Bottom Right Section: Pay Slip Banner (y = 93 to 117)
      doc.rect(150, 93, 415, 24).fillAndStroke("#F9FAFB", "#333333");
      doc.fillColor(darkColor).fontSize(10.5).font(fontBold).text(`Pay Slip - ${period || 'Jul 2026'}`, 150, 100, { width: 415, align: "center" });

      // Employee Metadata Table Grid (starts at y = 117)
      const startY = 117;
      const rowH = 18;

      const metaFields = [
        ["Employee Name", employeeName || "", "Bank Name", bankName || ""],
        ["Employee Code", employeeId || "", "IFSC Code", ifsc || ""],
        ["Designation", role || "", "Account No.", bankAccountNo || ""],
        ["Department", dept || "", "PF Account No.", pfAccountNo || ""],
        ["Days in Month", `${daysInMonth || 30}`, "", ""],
        ["Days Payable", `${daysPayable || 30}`, "", ""],
      ];

      const metaTotalH = metaFields.length * rowH;

      // Draw horizontal rows and text
      metaFields.forEach((row, i) => {
        const y = startY + i * rowH;
        doc.rect(30, y, 535, rowH).strokeColor("#333333").lineWidth(0.5).stroke();
        doc.fillColor("#444444").fontSize(8.5).font(fontRegular).text(row[0], 35, y + 4, { width: 115, lineBreak: false });

        const v1 = String(row[1] || "");
        const v1Font = v1.length > 24 ? 7 : v1.length > 18 ? 7.5 : 8.5;
        doc.fillColor(darkColor).fontSize(v1Font).font(fontBold).text(v1, 155, y + 4, { width: 140, lineBreak: false });

        doc.fillColor("#444444").fontSize(8.5).font(fontRegular).text(row[2], 305, y + 4, { width: 115, lineBreak: false });

        const v2 = String(row[3] || "");
        const v2Font = v2.length > 24 ? 7 : v2.length > 18 ? 7.5 : 8.5;
        doc.fillColor(darkColor).fontSize(v2Font).font(fontBold).text(v2, 425, y + 4, { width: 135, lineBreak: false });
      });

      // Vertical Grid Lines for Metadata Table
      doc.moveTo(150, startY).lineTo(150, startY + metaTotalH).stroke();
      doc.moveTo(300, startY).lineTo(300, startY + metaTotalH).stroke();
      doc.moveTo(420, startY).lineTo(420, startY + metaTotalH).stroke();

      // COMPONENTS Section Banner
      const compY = startY + metaTotalH;
      doc.rect(30, compY, 535, 20).fillAndStroke("#E5E7EB", "#333333");
      doc.fillColor(darkColor).fontSize(10).font(fontBold).text("COMPONENTS", 30, compY + 5, { align: "center" });

      // Table Header Row: Earnings (30%) | Amount (₹) (20%) | Deductions (30%) | Amount (₹) (20%)
      const headerY = compY + 20;
      doc.rect(30, headerY, 535, 20).fillAndStroke("#F9FAFB", "#333333");
      doc.fillColor(darkColor).fontSize(8.5).font(fontBold);
      doc.text("Earnings", 35, headerY + 5);
      doc.text("Amount (₹)", 195, headerY + 5, { width: 97, align: "right" });
      doc.text("Deductions", 302, headerY + 5);
      doc.text("Amount (₹)", 463, headerY + 5, { width: 97, align: "right" });

      const eList = Array.isArray(earnings) ? earnings.filter(item => item && item.name) : [];
      const dList = Array.isArray(deductions) ? deductions.filter(item => item && item.name) : [];
      const rowCount = Math.max(eList.length, dList.length, 1);

      let tableY = headerY + 20;

      for (let i = 0; i < rowCount; i++) {
        const y = tableY + i * rowH;
        doc.rect(30, y, 535, rowH).strokeColor("#333333").lineWidth(0.5).stroke();

        const e = eList[i];
        const d = dList[i];

        if (e) {
          const eName = String(e.name || "");
          const eFont = eName.length > 28 ? 7 : eName.length > 22 ? 7.5 : 8.5;
          doc.fillColor(darkColor).fontSize(eFont).font(fontRegular).text(eName, 35, y + 4, { width: 150, lineBreak: false });
          doc.fillColor(darkColor).fontSize(8.5).font(fontRegular).text(formatMoney(e.amount), 195, y + 4, { width: 97, align: "right", lineBreak: false });
        }
        if (d) {
          const dName = String(d.name || "");
          const dFont = dName.length > 28 ? 7 : dName.length > 22 ? 7.5 : 8.5;
          doc.fillColor(darkColor).fontSize(dFont).font(fontRegular).text(dName, 302, y + 4, { width: 150, lineBreak: false });
          doc.fillColor(darkColor).fontSize(8.5).font(fontRegular).text(formatMoney(d.amount), 463, y + 4, { width: 97, align: "right", lineBreak: false });
        }
      }

      // Vertical Grid Lines for Components Table (Header + Component Rows)
      const compRowsH = rowCount * rowH + 20;
      doc.moveTo(190, headerY).lineTo(190, headerY + compRowsH).stroke();
      doc.moveTo(297, headerY).lineTo(297, headerY + compRowsH).stroke();
      doc.moveTo(458, headerY).lineTo(458, headerY + compRowsH).stroke();

      // Totals Rows: Total Earnings (A) & Total Deductions (B) on same row, Net Salary below on right, Net Salary in Words below
      const totalGross = safeNum(gross);
      const totalDed = safeNum(totalDeductions);
      const netVal = net != null ? safeNum(net) : (netPay != null ? safeNum(netPay) : (totalGross - totalDed));

      let totalsY = tableY + rowCount * rowH;

      // Row 1: Total Earnings (A) [Left 30%+20%] & Total Deductions (B) [Right 30%+20%]
      doc.rect(30, totalsY, 535, rowH).strokeColor("#333333").lineWidth(0.5).stroke();
      doc.fillColor(darkColor).fontSize(8.5).font(fontBold).text("Total Earnings (A)", 35, totalsY + 4);
      doc.fillColor(darkColor).fontSize(8.5).font(fontBold).text(formatMoney(totalGross), 195, totalsY + 4, { width: 97, align: "right" });
      doc.fillColor(darkColor).fontSize(8.5).font(fontBold).text("Total Deductions (B)", 302, totalsY + 4);
      doc.fillColor(darkColor).fontSize(8.5).font(fontBold).text(formatMoney(totalDed), 463, totalsY + 4, { width: 97, align: "right" });
      doc.moveTo(190, totalsY).lineTo(190, totalsY + rowH).stroke();
      doc.moveTo(297, totalsY).lineTo(297, totalsY + rowH).stroke();
      doc.moveTo(458, totalsY).lineTo(458, totalsY + rowH).stroke();

      totalsY += rowH;
      // Row 2: Net Salary (on the right half)
      doc.rect(30, totalsY, 535, rowH).strokeColor("#333333").lineWidth(0.5).stroke();
      doc.fillColor(darkColor).fontSize(9).font(fontBold).text("Net Salary", 302, totalsY + 4);
      doc.fillColor(darkColor).fontSize(9).font(fontBold).text(formatMoney(netVal), 463, totalsY + 4, { width: 97, align: "right" });
      doc.moveTo(190, totalsY).lineTo(190, totalsY + rowH).stroke();
      doc.moveTo(297, totalsY).lineTo(297, totalsY + rowH).stroke();
      doc.moveTo(458, totalsY).lineTo(458, totalsY + rowH).stroke();

      totalsY += rowH;
      // Row 3: Net Salary in Words
      doc.rect(30, totalsY, 535, rowH).strokeColor("#333333").lineWidth(0.5).stroke();
      doc.fillColor(darkColor).fontSize(8.5).font(fontBold).text("Net Salary in Words", 35, totalsY + 4);
      doc.fillColor(darkColor).fontSize(8.5).font(fontBold).text(numberToWords(netVal), 195, totalsY + 4, { width: 365, lineBreak: false });
      doc.moveTo(190, totalsY).lineTo(190, totalsY + rowH).stroke();

      // Footnote at bottom, centred across the table's full width (x = 30 to 565)
      doc.fillColor("#444444").fontSize(8).font(fontRegular).text("This is a computer generated salary slip and does not require signature", 30, totalsY + 25, { width: 535, align: "center" });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
