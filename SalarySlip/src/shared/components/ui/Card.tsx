import type { ReactNode } from "react";
import { cn } from "@/shared/lib/cn";

export function Card({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-[14px] border border-line bg-white p-5 max-mob:overflow-x-auto",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "mb-4 flex flex-wrap items-center justify-between gap-3",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardTitle({ children }: { children: ReactNode }) {
  return <h3 className="m-0 text-[15px] font-[650]">{children}</h3>;
}
