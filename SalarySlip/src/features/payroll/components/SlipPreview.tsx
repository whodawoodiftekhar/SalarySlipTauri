import { FileCheck2, Loader2 } from "lucide-react";
import { useSettings } from "@/features/settings/hooks/useSettings";
import { Button } from "@/shared/components/ui/Button";
import { Card } from "@/shared/components/ui/Card";
import { LOGO } from "@/shared/lib/branding";
import { inr } from "@/shared/lib/format";
import type { ComputedComponent, Employee, PayrollResult } from "@/shared/types";

function Col({
  title,
  rows,
  tone,
}: {
  title: string;
  rows: ComputedComponent[];
  tone: "earn" | "deduct";
}) {
  return (
    <div className="px-3 first:border-r first:border-line first:pl-0">
      <div
        className={`mb-[5px] border-b border-line pb-[7px] text-[11px] font-bold uppercase tracking-[0.07em] ${
          tone === "earn" ? "text-earn" : "text-deduct"
        }`}
      >
        {title}
      </div>
      {rows.map((r) => (
        <div key={r.id} className="flex justify-between gap-2 py-1 text-[12.5px]">
          <span className="text-ash">{r.name}</span>
          <b className="font-mono font-semibold tabular-nums">{inr(r.amount)}</b>
        </div>
      ))}
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-[11px] uppercase tracking-[0.05em] text-ash">
        {label}
      </span>
      <b className="text-right text-[12.5px]">{value}</b>
    </div>
  );
}

export function SlipPreview({
  emp,
  res,
  dim,
  dpay,
  period,
  finalizing,
  onGenerate,
}: {
  emp: Employee;
  res: PayrollResult;
  dim: string;
  dpay: string;
  period: string;
  finalizing: boolean;
  onGenerate: () => void;
}) {
  const { company, slipDefaults } = useSettings();

  return (
    <Card className="sticky top-[92px]">
      <div className="flex items-center gap-3 border-b border-line pb-[14px]">
        <img
          src={company.logoUrl || LOGO}
          alt={company.name}
          className="h-[30px] w-auto max-h-[30px] flex-none object-contain"
        />
        <div>
          <b className="text-[13px]">{company.legalName}</b>
          <small className="block text-[11.5px] text-ash">
            {company.addressShort}
          </small>
        </div>
      </div>

      <div className="mb-[14px] mt-3 text-center text-[12px] font-bold uppercase tracking-[0.04em]">
        Pay Slip — {period}
      </div>

      <div className="grid grid-cols-2 gap-x-[18px] gap-y-[7px] border-b border-line pb-[14px]">
        <Meta label="Employee" value={emp.name} />
        <Meta label="Designation" value={emp.role} />
        <Meta label="Code" value={emp.id} />
        <Meta label="Bank Name" value={emp.bankName || slipDefaults.bankName} />
        <Meta label="Department" value={emp.dept} />
        <Meta label="Bank Account" value={emp.bankAccountNo || slipDefaults.bankAccountNo} />
        <Meta label="Days payable" value={`${dpay} / ${dim}`} />
        <Meta label="PF Account" value={emp.pfAccountNo || slipDefaults.pfAccountNo} />
      </div>

      <div className="mt-[14px] grid grid-cols-2">
        <Col title="Earnings" rows={res.earnings} tone="earn" />
        <Col title="Deductions" rows={res.deductions} tone="deduct" />
      </div>

      <div className="mt-[14px] flex flex-col gap-[5px] border-t border-line pt-[11px]">
        <div className="flex justify-between text-[13px]">
          <span className="text-ash">Gross (A)</span>
          <b className="font-mono tabular-nums text-earn">{inr(res.gross)}</b>
        </div>
        <div className="flex justify-between text-[13px]">
          <span className="text-ash">Deductions (B)</span>
          <b className="font-mono tabular-nums text-deduct">
            {inr(res.totalDeductions)}
          </b>
        </div>
      </div>

      <div className="mt-[14px] flex items-center justify-between rounded-xl bg-ink px-[17px] py-[15px] text-white">
        <span className="text-[10.5px] uppercase tracking-[0.1em] opacity-70">
          Net salary
        </span>
        <div className="font-mono text-[23px] font-bold tracking-[-0.01em] tabular-nums">
          ₹ {inr(res.net)}
        </div>
      </div>

      <Button size="wide" onClick={onGenerate} disabled={finalizing}>
        {finalizing ? (
          <Loader2 size={15} className="animate-spin" />
        ) : (
          <FileCheck2 size={15} />
        )}
        {finalizing ? "Finalizing…" : "Generate & finalize payslip"}
      </Button>
    </Card>
  );
}
