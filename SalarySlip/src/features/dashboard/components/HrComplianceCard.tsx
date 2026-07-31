import { ShieldCheck, Printer } from "lucide-react";
import { Card } from "@/shared/components/ui/Card";
import { inr0 } from "@/shared/lib/format";
import type { RosterEntry } from "@/shared/types";

export function HrComplianceCard({ roster, period }: { roster: RosterEntry[]; period: string }) {
  // Compute statutory totals
  let totalPf = 0;
  let totalPt = 0;
  let totalTds = 0;

  for (const e of roster) {
    const pfLine = e.deductions?.find((d) => d.id === "pf");
    const ptLine = e.deductions?.find((d) => d.id === "pt");
    const tdsLine = e.deductions?.find((d) => d.id === "tds");

    totalPf += pfLine ? pfLine.amount : 0;
    totalPt += ptLine ? ptLine.amount : 0;
    totalTds += tdsLine ? tdsLine.amount : 0;
  }

  const avgNet = roster.length > 0 ? Math.round(roster.reduce((s, e) => s + e.net, 0) / roster.length) : 0;

  const handlePrintSummary = () => {
    window.print();
  };

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3.5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="text-accent" size={18} />
          <div>
            <h3 className="m-0 text-[15px] font-bold text-ink">HR Statutory &amp; Tax Compliance ({period})</h3>
            <p className="mt-0.5 text-[12px] text-mist">
              Summary of Provident Fund, Professional Tax, TDS deductions, and HR averages.
            </p>
          </div>
        </div>

        <button
          onClick={handlePrintSummary}
          className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-paper px-3 py-1.5 text-[12.5px] font-semibold text-ink hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <Printer size={14} /> Print Summary Report
        </button>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-4 max-tab:grid-cols-2 max-mob:grid-cols-1">
        <div className="rounded-xl border border-line bg-slate-50/50 p-3.5">
          <span className="text-[11.5px] font-semibold text-ash uppercase tracking-wider block">
            Provident Fund (PF)
          </span>
          <b className="mt-1 text-[18px] font-extrabold text-ink tabular-nums block">
            ₹{inr0(totalPf)}
          </b>
          <small className="mt-0.5 block text-[11px] text-mist">Statutory EPF Pool</small>
        </div>

        <div className="rounded-xl border border-line bg-slate-50/50 p-3.5">
          <span className="text-[11.5px] font-semibold text-ash uppercase tracking-wider block">
            Professional Tax (PT)
          </span>
          <b className="mt-1 text-[18px] font-extrabold text-ink tabular-nums block">
            ₹{inr0(totalPt)}
          </b>
          <small className="mt-0.5 block text-[11px] text-mist">State Govt Tax</small>
        </div>

        <div className="rounded-xl border border-line bg-slate-50/50 p-3.5">
          <span className="text-[11.5px] font-semibold text-ash uppercase tracking-wider block">
            TDS Tax Withheld
          </span>
          <b className="mt-1 text-[18px] font-extrabold text-ink tabular-nums block">
            ₹{inr0(totalTds)}
          </b>
          <small className="mt-0.5 block text-[11px] text-mist">Income Tax Deduction</small>
        </div>

        <div className="rounded-xl border border-line bg-slate-50/50 p-3.5">
          <span className="text-[11.5px] font-semibold text-ash uppercase tracking-wider block">
            Avg Employee Salary
          </span>
          <b className="mt-1 text-[18px] font-extrabold text-earn tabular-nums block">
            ₹{inr0(avgNet)}
          </b>
          <small className="mt-0.5 block text-[11px] text-mist">Per Employee / Month</small>
        </div>
      </div>
    </Card>
  );
}
