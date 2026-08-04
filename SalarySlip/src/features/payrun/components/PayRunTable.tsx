import { AlertTriangle, CalendarClock, MailX, RefreshCcw } from "lucide-react";
import { Avatar } from "@/shared/components/ui/Avatar";
import { initials, inr } from "@/shared/lib/format";
import type { PayRunRow } from "../types";

const TH =
  "border-b border-line px-3 pb-[10px] text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-mist";
const TD = "border-b border-hairline p-3 align-middle text-[13.5px]";

export function PayRunTable({
  rows,
  excluded,
  daysDraft,
  onToggle,
  onToggleAll,
  onDaysChange,
}: {
  rows: PayRunRow[];
  excluded: string[];
  daysDraft: Record<string, string>;
  onToggle: (employeeId: string) => void;
  onToggleAll: () => void;
  onDaysChange: (employeeId: string, value: string) => void;
}) {
  const allSelected = excluded.length === 0;

  return (
    <table className="w-full border-collapse max-mob:min-w-[940px]">
      <thead>
        <tr>
          <th className={`${TH} w-[38px]`}>
            <input
              type="checkbox"
              className="h-[15px] w-[15px] accent-accent"
              checked={allSelected}
              onChange={onToggleAll}
              aria-label={allSelected ? "Clear selection" : "Select every employee"}
              title={allSelected ? "Clear selection" : "Select every employee"}
            />
          </th>
          <th className={TH}>Employee</th>
          <th className={TH}>Department</th>
          <th className={`${TH} text-center`}>Days in month</th>
          <th className={`${TH} text-center`}>Days payable</th>
          <th className={`${TH} text-right`}>Gross</th>
          <th className={`${TH} text-right`}>Deductions</th>
          <th className={`${TH} text-right`}>Net</th>
          <th className={TH}>Notes</th>
        </tr>
      </thead>
      <tbody className="[&>tr:last-child>td]:border-b-0">
        {rows.map((row) => {
          const included = !excluded.includes(row.employeeId);

          // Never show a count the run would not honour. A draft above the
          // month's length is clamped for the totals, so displaying it raw made
          // the box disagree with the gross and net beside it. An empty or
          // part-typed value is left alone so the field stays editable.
          const draft = daysDraft[row.employeeId];
          const daysShown =
            draft == null
              ? String(row.daysPayable)
              : Number(draft) > row.daysInMonth
                ? String(row.daysInMonth)
                : draft;

          return (
            <tr key={row.employeeId} className={included ? undefined : "opacity-45"}>
              <td className={TD}>
                <input
                  type="checkbox"
                  className="h-[15px] w-[15px] accent-accent"
                  checked={included}
                  onChange={() => onToggle(row.employeeId)}
                  aria-label={`Include ${row.employeeName} in this run`}
                />
              </td>

              <td className={TD}>
                <div className="flex items-center gap-[10px]">
                  <Avatar label={initials(row.employeeName)} size="sm" />
                  <div>
                    <b className="block">{row.employeeName}</b>
                    <small className="text-[11.5px] text-mist">
                      {row.employeeId}
                      {row.role && <span className="text-slate-400"> · {row.role}</span>}
                    </small>
                  </div>
                </div>
              </td>

              <td className={`${TD} text-[13px] text-ash`}>{row.dept || "—"}</td>

              <td className={`${TD} text-center font-mono tabular-nums text-mist`}>
                {row.daysInMonth}
              </td>

              <td className={`${TD} text-center`}>
                <input
                  type="number"
                  min={0}
                  max={row.daysInMonth}
                  className="w-[74px] rounded-lg border border-line px-2 py-[6px] text-center tabular-nums focus:border-accent focus:outline-none"
                  value={daysShown}
                  onChange={(e) => onDaysChange(row.employeeId, e.target.value)}
                  disabled={!included}
                  aria-label={`Days payable for ${row.employeeName}`}
                />
              </td>

              <td className={`${TD} text-right font-mono tabular-nums`}>
                ₹{inr(row.gross)}
              </td>
              <td className={`${TD} text-right font-mono tabular-nums text-deduct`}>
                ₹{inr(row.totalDeductions)}
              </td>
              <td
                className={`${TD} text-right font-mono font-bold tabular-nums ${
                  row.net < 0 ? "text-danger" : "text-earn"
                }`}
                title={
                  row.net < 0
                    ? "Deductions exceed earnings for these days — this employee would owe money"
                    : undefined
                }
              >
                ₹{inr(row.net)}
              </td>

              <td className={TD}>
                <div className="flex flex-col gap-1">
                  {row.alreadyFinalized && (
                    <span
                      className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-warn-ink"
                      title={
                        row.previousNet == null
                          ? undefined
                          : `Stored net ₹${inr(row.previousNet)} will be replaced`
                      }
                    >
                      <RefreshCcw size={12} /> Will replace existing slip
                    </span>
                  )}
                  {row.lopHasNoEffect && (
                    <span
                      className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-warn-ink"
                      title="Every line in this structure is marked as paid whole, so fewer days does not reduce pay. Open this employee's payroll screen and tick LOP on the lines that should be day-rated."
                    >
                      <AlertTriangle size={12} /> LOP has no effect on pay
                    </span>
                  )}
                  {row.dayRated && (
                    <span className="text-[11.5px] font-semibold text-ash">
                      Day-rated at {(row.factor * 100).toFixed(1)}%
                    </span>
                  )}
                  {row.daysFromRegister && row.lopDays > 0 && (
                    <span
                      className="inline-flex items-center gap-1 text-[11.5px] text-accent"
                      title="Days payable came from what was saved on this employee's payroll screen for this period"
                    >
                      <CalendarClock size={12} /> {row.lopDays} LOP day
                      {row.lopDays === 1 ? "" : "s"} on record
                    </span>
                  )}
                  {!row.hasEmail && (
                    <span
                      className="inline-flex items-center gap-1 text-[11.5px] text-mist"
                      title="This employee has no email address, so bulk email will skip them"
                    >
                      <MailX size={12} /> No email on file
                    </span>
                  )}
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
