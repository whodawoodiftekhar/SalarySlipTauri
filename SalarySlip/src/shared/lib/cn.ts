/** Tiny class-name joiner — drops falsy entries. */
export const cn = (...parts: (string | false | null | undefined)[]): string =>
  parts.filter(Boolean).join(" ");
