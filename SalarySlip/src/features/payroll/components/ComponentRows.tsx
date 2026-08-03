import { Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { CALC_LABELS } from "@/shared/lib/calc";
import { inr } from "@/shared/lib/format";
import type { CalcMethod, SalaryComponent } from "@/shared/types";

const CONTROL =
  "min-w-0 rounded-[7px] border border-line bg-white px-2 py-[7px] text-[13px]";

export function ComponentRows({
  rows,
  update,
  // updateBulk,
  remove,
  amountOf,
}: {
  rows: SalaryComponent[];
  update: (id: string, patch: Partial<SalaryComponent>) => void;
  updateBulk?: (ids: string[], patch: Partial<SalaryComponent>) => void;
  remove: (id: string) => void;
  amountOf: (id: string) => number;
}) {
  // const allChecked = rows.length > 0 && rows.every((c) => !!c.prorate);

  // const toggleAll = (checked: boolean) => {
  //   const ids = rows.map((c) => c.id);
  //   if (updateBulk) {
  //     updateBulk(ids, { prorate: checked });
  //   } else {
  //     rows.forEach((c) => update(c.id, { prorate: checked }));
  //   }
  // };

  return (
    <div className="flex flex-col gap-1.5">
      {rows.length > 0 && (
        <div className="grid grid-cols-[1fr_104px_72px_56px_100px_26px] items-center gap-1.5 px-0.5 pb-1 text-[11px] font-semibold text-ash max-mob:min-w-[500px]">
          <span>Component</span>
          <span>Calc</span>
          {/* <span className="text-right">Value</span>
          <label
            className="flex items-center gap-1 whitespace-nowrap text-[10px] font-bold text-ink cursor-pointer select-none"
            title="Check / Uncheck all LOP"
          >
            <input
              type="checkbox"
              checked={allChecked}
              onChange={(e) => toggleAll(e.target.checked)}
            />
            All LOP
          </label> */}
          <span className="text-right">Amount</span>
          <span />
        </div>
      )}
      {rows.map((c) => (
        <div
          key={c.id}
          className="grid grid-cols-[1fr_104px_72px_56px_100px_26px] items-center gap-1.5 max-mob:min-w-[500px]"
        >
          <input
            className={CONTROL}
            value={c.name}
            onChange={(e) => update(c.id, { name: e.target.value })}
          />
          <select
            className={CONTROL}
            value={c.calc}
            onChange={(e) => update(c.id, { calc: e.target.value as CalcMethod })}
          >
            {(Object.entries(CALC_LABELS) as [CalcMethod, string][]).map(
              ([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ),
            )}
          </select>
          <input
            className={`${CONTROL} text-right tabular-nums disabled:bg-[#f4f5f8] disabled:text-ash`}
            type="number"
            value={c.calc === "statutory_pf" ? 12 : c.value}
            disabled={c.calc === "statutory_pf"}
            onChange={(e) => update(c.id, { value: e.target.value })}
          />
          <label
            className="flex items-center gap-1 whitespace-nowrap text-[10px] text-ash cursor-pointer select-none"
            title="Reduce with loss of pay"
          >
            <input
              type="checkbox"
              checked={!!c.prorate}
              onChange={(e) => update(c.id, { prorate: e.target.checked })}
            />
            LOP
          </label>
          <span className="text-right font-mono text-[13px] font-semibold tabular-nums">
            {inr(amountOf(c.id))}
          </span>
          {c.isBasic ? (
            <span />
          ) : (
            <button
              className="grid place-items-center border-none bg-transparent p-0.5 text-danger"
              onClick={() => remove(c.id)}
              aria-label={`Remove ${c.name}`}
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

export function GroupHeading({
  tone,
  children,
  className,
}: {
  tone: "earn" | "deduct";
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`mb-[9px] flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.08em] text-ash ${className ?? ""}`}
    >
      <span
        className={`h-2 w-2 rounded-full ${tone === "earn" ? "bg-earn" : "bg-deduct"}`}
      />
      {children}
    </div>
  );
}

export function AddComponentButton({
  tone,
  onClick,
}: {
  tone: "earn" | "deduct";
  onClick: () => void;
}) {
  return (
    <button
      className={`mt-[11px] rounded-lg border border-dashed border-line bg-white px-3 py-2 text-[12.5px] font-semibold text-ash ${
        tone === "earn"
          ? "hover:border-earn hover:text-earn"
          : "hover:border-deduct hover:text-deduct"
      }`}
      onClick={onClick}
    >
      + Add {tone === "earn" ? "earning" : "deduction"}
    </button>
  );
}
