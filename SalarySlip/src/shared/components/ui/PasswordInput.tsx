import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { FIELD_INPUT } from "./Field";

/**
 * Masked text input with a reveal toggle.
 *
 * Used for the per-employee payslip PDF password. HR has to be able to read the
 * value back — it is dictated to employees and printed in the covering mail —
 * so this deliberately holds a readable value behind a toggle rather than
 * behaving like a write-only secret.
 */
export function PasswordInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
}) {
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="relative flex">
      <input
        className={`${FIELD_INPUT} w-full pr-9`}
        type={revealed ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        // stops the browser offering a saved login here
        autoComplete="new-password"
      />
      <button
        type="button"
        onClick={() => setRevealed((prev) => !prev)}
        // not a form control HR tabs through; the input beside it is
        tabIndex={-1}
        aria-label={revealed ? "Hide password" : "Show password"}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-mist transition-colors hover:text-ink"
      >
        {revealed ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </div>
  );
}
