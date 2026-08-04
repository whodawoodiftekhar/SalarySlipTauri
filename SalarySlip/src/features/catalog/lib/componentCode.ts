/**
 * The one rule for typing a component code, shared by the add and edit dialogs
 * so the two can never disagree about what HR is allowed to enter.
 *
 * A code is not a label — `code.toLowerCase()` is the field name an employee's
 * amount is stored under and the id `makeStructure` builds a structure line
 * from, so it has to be a plain key. The API upper-cases it on the way in too;
 * this is what makes that visible while HR types instead of after saving.
 */

/**
 * Capitals, digits and underscore — everything else cannot be part of a key.
 * Whitespace becomes `_` rather than vanishing, because `makeStructure` already
 * turns a space into `_` when it derives a line id from the code; dropping it
 * here would leave the code and the id it generates spelled differently.
 */
export const normalizeComponentCode = (raw: string) =>
  raw
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/[^A-Z0-9_]/g, "");

/**
 * What normalising just changed, phrased for HR. Empty when the raw input was
 * already a valid code, so the warning shows up only when it has something to
 * say and clears itself as soon as the typing is clean.
 */
export const componentCodeNote = (raw: string): string => {
  const hasSmall = /[a-z]/.test(raw);
  const hasSpace = /\s/.test(raw);
  const hasOther = /[^A-Za-z0-9_\s]/.test(raw);

  if (!hasSmall && !hasSpace && !hasOther) return "";

  const fixes = [
    hasSmall && "small letters were capitalised",
    hasSpace && "spaces became _",
    hasOther && "anything that is not a letter, digit or _ was dropped",
  ].filter(Boolean);

  return `Codes are stored in CAPITALS — ${fixes.join(", ")}.`;
};

/**
 * A normalised code is only usable once it carries a letter or a digit — "_" on
 * its own survives normalising but names nothing.
 */
export const isComponentCode = (code: string) => /[A-Z0-9]/.test(code);
