export const round2 = (n: number | undefined | null): number =>
  Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;

/** Tolerant number coercion — empty inputs and junk become 0. */
export const num = (v: unknown): number =>
  v === "" || v == null || isNaN(Number(v)) ? 0 : Number(v);

export const inr = (n: number | undefined | null): string =>
  Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export const inr0 = (n: number | undefined | null): string =>
  Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });

export const initials = (name: string | undefined | null): string =>
  String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((x) => x[0])
    .join("")
    .toUpperCase() || "?";

export const toWords = (amount: number | undefined | null): string => {
  const n = Math.abs(num(amount));
  if (n === 0) return "Rupees Zero Only";

  const units = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const tens = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

  const convertBelowThousand = (numVal: number): string => {
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
        if (numVal % 10 > 0) {
          str += " " + units[numVal % 10];
        }
      }
    }
    return str;
  };

  const rupeesInt = Math.floor(n);
  const paiseInt = Math.round((n - rupeesInt) * 100);

  let rupeeStr = "";
  let tempRupees = rupeesInt;

  if (tempRupees >= 10000000) {
    const crores = Math.floor(tempRupees / 10000000);
    rupeeStr += convertBelowThousand(crores) + " Crore ";
    tempRupees %= 10000000;
  }
  if (tempRupees >= 100000) {
    const lakhs = Math.floor(tempRupees / 100000);
    rupeeStr += convertBelowThousand(lakhs) + " Lakh ";
    tempRupees %= 100000;
  }
  if (tempRupees >= 1000) {
    const thousands = Math.floor(tempRupees / 1000);
    rupeeStr += convertBelowThousand(thousands) + " Thousand ";
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
};

