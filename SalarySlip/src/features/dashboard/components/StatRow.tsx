import { FileCheck2, TrendingDown, Users, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { inr0 } from "@/shared/lib/format";
import type { RosterEntry } from "@/shared/types";

type Tone = "ink" | "earn" | "deduct" | "accent";

const TONE: Record<Tone, string> = {
  ink: "bg-ink-soft text-ink",
  earn: "bg-earn-soft text-earn",
  deduct: "bg-deduct-soft text-deduct",
  accent: "bg-accent-soft text-accent",
};

interface Stat {
  icon: LucideIcon;
  label: string;
  value: string | number;
  tone: Tone;
}

export function StatRow({ roster }: { roster: RosterEntry[] }) {
  const totalNet = roster.reduce((s, e) => s + e.net, 0);
  const totalDed = roster.reduce((s, e) => s + e.totalDeductions, 0);

  const stats: Stat[] = [
    { icon: Users, label: "Employees", value: roster.length, tone: "ink" },
    { icon: Wallet, label: "Net payroll", value: `₹${inr0(totalNet)}`, tone: "earn" },
    {
      icon: TrendingDown,
      label: "Total deductions",
      value: `₹${inr0(totalDed)}`,
      tone: "deduct",
    },
    {
      icon: FileCheck2,
      label: "Payslips ready",
      value: `${roster.length} / ${roster.length}`,
      tone: "accent",
    },
  ];

  return (
    <div className="mb-5 grid grid-cols-4 gap-4 max-tab:grid-cols-2 max-mob:gap-3">
      {stats.map((s) => (
        <div
          key={s.label}
          className="flex items-center gap-[13px] rounded-[14px] border border-line bg-white p-4"
        >
          <span
            className={cn(
              "grid h-10 w-10 flex-none place-items-center rounded-[11px]",
              TONE[s.tone],
            )}
          >
            <s.icon size={16} />
          </span>
          <div>
            <small className="mb-[3px] block text-[12px] text-ash">{s.label}</small>
            <b className="text-[20px] font-bold tracking-[-0.01em] tabular-nums">
              {s.value}
            </b>
          </div>
        </div>
      ))}
    </div>
  );
}
