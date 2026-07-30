export const round2 = (n: number): number =>
  Math.round((Number(n) + Number.EPSILON) * 100) / 100;

/** Tolerant number coercion — empty inputs and junk become 0. */
export const num = (v: unknown): number =>
  v === "" || v == null || isNaN(Number(v)) ? 0 : Number(v);

export const inr = (n: number): string =>
  Number(n).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export const inr0 = (n: number): string =>
  Number(n).toLocaleString("en-IN", { maximumFractionDigits: 0 });

export const initials = (name: string): string =>
  name
    .split(" ")
    .map((x) => x[0])
    .join("");
