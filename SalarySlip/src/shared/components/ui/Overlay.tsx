import type { ReactNode } from "react";

/**
 * Full-screen scrim. Keeps the literal `print-overlay` class because the print
 * stylesheet targets it directly.
 */
export function Overlay({
  onClose,
  children,
}: {
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className="print-overlay fixed inset-0 z-50 flex flex-col items-center overflow-auto bg-[rgba(20,23,31,0.55)] px-4 py-[26px]"
      onClick={onClose}
    >
      {children}
    </div>
  );
}
