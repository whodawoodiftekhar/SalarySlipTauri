import { Building2 } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import type { ComponentGroup } from "@/shared/types";

export function Badge({ group }: { group: ComponentGroup }) {
  return (
    <span
      className={cn(
        "rounded-md px-[9px] py-[3px] text-[11px] font-bold uppercase tracking-[0.04em]",
        group === "earning"
          ? "bg-earn-soft text-earn"
          : "bg-deduct-soft text-deduct",
      )}
    >
      {group}
    </span>
  );
}

export function DeptTag({ dept }: { dept: string }) {
  return (
    <span className="inline-flex items-center gap-[5px] rounded-[20px] bg-hover px-[10px] py-1 text-[12px] font-medium text-ash">
      <Building2 size={12} /> {dept}
    </span>
  );
}
