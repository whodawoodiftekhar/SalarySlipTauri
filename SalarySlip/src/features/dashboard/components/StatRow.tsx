import { DollarSign, TrendingDown, Users, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { inr0 } from "@/shared/lib/format";
import type { RosterEntry } from "@/shared/types";

interface StatItem {
  icon: LucideIcon;
  label: string;
  value: string;
  subtext: string;
  bgGradient: string;
  iconBg: string;
  iconColor: string;
}

export function StatRow({ roster }: { roster: RosterEntry[] }) {
  const totalGross = roster.reduce((s, e) => s + e.gross, 0);
  const totalNet = roster.reduce((s, e) => s + e.net, 0);
  const totalDed = roster.reduce((s, e) => s + e.totalDeductions, 0);
  const deptCount = new Set(roster.map((e) => e.dept)).size;

  const stats: StatItem[] = [
    {
      icon: Users,
      label: "Total Employees",
      value: String(roster.length),
      subtext: `${deptCount} Departments`,
      bgGradient: "from-blue-50/50 to-indigo-50/30",
      iconBg: "bg-blue-600/10",
      iconColor: "text-blue-600",
    },
    {
      icon: DollarSign,
      label: "Gross Earnings",
      value: `₹${inr0(totalGross)}`,
      subtext: "Before deductions",
      bgGradient: "from-emerald-50/50 to-teal-50/30",
      iconBg: "bg-emerald-600/10",
      iconColor: "text-emerald-600",
    },
    {
      icon: TrendingDown,
      label: "Total Deductions",
      value: `₹${inr0(totalDed)}`,
      subtext: "PF, PT, TDS combined",
      bgGradient: "from-rose-50/50 to-red-50/30",
      iconBg: "bg-rose-600/10",
      iconColor: "text-rose-600",
    },
    {
      icon: Wallet,
      label: "Net Payroll Payout",
      value: `₹${inr0(totalNet)}`,
      subtext: "Final take-home total",
      bgGradient: "from-purple-50/50 to-indigo-50/30",
      iconBg: "bg-purple-600/10",
      iconColor: "text-purple-600",
    },
  ];

  return (
    <div className="mb-6 grid grid-cols-4 gap-4 max-tab:grid-cols-2 max-mob:grid-cols-1">
      {stats.map((s) => (
        <div
          key={s.label}
          className="relative overflow-hidden rounded-2xl border border-line bg-white p-4.5 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
        >
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold tracking-wide text-ash uppercase">
              {s.label}
            </span>
            <div className={`grid h-9 w-9 place-items-center rounded-xl ${s.iconBg} ${s.iconColor}`}>
              <s.icon size={18} />
            </div>
          </div>

          <div className="mt-2.5">
            <b className="text-[22px] font-extrabold tracking-tight text-ink tabular-nums block">
              {s.value}
            </b>
            <span className="mt-1 block text-[11.5px] font-medium text-mist">
              {s.subtext}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
