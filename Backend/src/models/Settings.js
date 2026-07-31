export const DEFAULT_SETTINGS = {
  company: {
    name: "COMM-IT",
    legalName: "COMM-IT INDIA PVT. LTD.",
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
    footNote:
      "This is a computer generated salary slip and does not require signature",
  },
  currentUser: {
    initials: "HR",
    name: "HR Admin",
    email: "payroll@comm-it.com",
  },
};

/** Static org configuration — no database collection used. */
export async function getSettings() {
  return DEFAULT_SETTINGS;
}
