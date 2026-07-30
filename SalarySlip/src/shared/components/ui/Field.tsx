import type { ReactNode } from "react";

/** Shared input styling for the add-employee form. */
export const FIELD_INPUT =
  "rounded-[9px] border border-line bg-white px-[11px] py-[9px] text-[13.5px] font-medium text-ink focus:border-accent focus:outline-none";

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-[5px] text-[12px] font-semibold text-ash">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function FormSection({ children }: { children: ReactNode }) {
  return (
    <div className="col-span-full mt-1.5 text-[11px] font-bold uppercase tracking-[0.06em] text-ash">
      {children}
    </div>
  );
}
