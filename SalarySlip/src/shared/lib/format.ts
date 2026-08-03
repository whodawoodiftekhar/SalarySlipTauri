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
