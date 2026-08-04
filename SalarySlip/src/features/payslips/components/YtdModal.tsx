import { CalendarRange, Loader2, X } from "lucide-react";
import { useCallback, useState } from "react";
import { ErrorState } from "@/shared/components/feedback/ErrorState";
import { Button } from "@/shared/components/ui/Button";
import { Overlay } from "@/shared/components/ui/Overlay";
import { useAsync } from "@/shared/hooks/useAsync";
import { inr } from "@/shared/lib/format";
import { payslipService } from "../services/payslipService";

const CELL = "border-b border-hairline px-3 py-2 text-[13px]";

/** Financial-year totals for one employee, built from finalized slips only. */
export function YtdModal({
  employeeId,
  employeeName,
  onClose,
}: {
  employeeId: string;
  employeeName: string;
  onClose: () => void;
}) {
  const [fy, setFy] = useState<number | undefined>(undefined);

  const fetcher = useCallback(
    () => payslipService.ytd(employeeId, fy),
    [employeeId, fy],
  );
  const { data, loading, error, refetch } = useAsync(fetcher);

  const earnings = (data?.components ?? []).filter((c) => c.group === "earning");
  const deductions = (data?.components ?? []).filter((c) => c.group === "deduction");

  return (
    <Overlay onClose={onClose}>
      <div
        className="w-full max-w-[640px] rounded-[14px] bg-white p-5 shadow-[0_20px_60px_rgba(0,0,0,0.35)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-line pb-3">
          <div className="flex items-center gap-2">
            <CalendarRange className="text-accent" size={18} />
            <div>
              <h3 className="m-0 text-[15px] font-bold text-ink">
                Year to date — {employeeName}
              </h3>
              <small className="text-[12px] text-mist">
                {data?.financialYear
                  ? `Financial year ${data.financialYear.label} · ${data.monthsPaid} month${data.monthsPaid === 1 ? "" : "s"} paid`
                  : "Apr–Mar, from finalized payslips"}
              </small>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {(data?.availableYears?.length ?? 0) > 1 && (
              <select
                className="rounded-lg border border-line bg-white px-2.5 py-[6px] text-[12.5px] font-semibold text-ink focus:outline-none focus:ring-1 focus:ring-accent"
                value={data?.financialYear?.startYear ?? ""}
                onChange={(e) => setFy(Number(e.target.value))}
              >
                {data?.availableYears.map((y) => (
                  <option key={y} value={y}>
                    FY {y}-{String((y + 1) % 100).padStart(2, "0")}
                  </option>
                ))}
              </select>
            )}
            <Button variant="overlayGhost" onClick={onClose}>
              <X size={15} /> Close
            </Button>
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center gap-2 py-10 text-[13px] text-mist">
            <Loader2 size={16} className="animate-spin" /> Adding up the year…
          </div>
        )}

        {error && (
          <div className="pt-4">
            <ErrorState
              title="Could not load the year-to-date totals"
              error={error}
              onRetry={refetch}
            />
          </div>
        )}

        {data && !loading && !error && (
          <>
            {data.monthsPaid === 0 ? (
              <p className="py-10 text-center text-[13px] text-mist">
                No finalized payslips for this employee yet.
              </p>
            ) : (
              <>
                <div className="mt-4 grid grid-cols-3 gap-3 max-mob:grid-cols-1">
                  {[
                    { label: "Gross earned", value: data.totals.gross, tone: "text-ink" },
                    {
                      label: "Total deductions",
                      value: data.totals.totalDeductions,
                      tone: "text-deduct",
                    },
                    { label: "Net paid", value: data.totals.net, tone: "text-earn" },
                  ].map((s) => (
                    <div
                      key={s.label}
                      className="rounded-xl border border-line bg-paper/60 p-3"
                    >
                      <span className="block text-[11px] font-semibold uppercase tracking-[0.05em] text-ash">
                        {s.label}
                      </span>
                      <b className={`mt-1 block text-[17px] font-extrabold tabular-nums ${s.tone}`}>
                        ₹{inr(s.value)}
                      </b>
                    </div>
                  ))}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4 max-mob:grid-cols-1">
                  <div>
                    <h4 className="mb-1 text-[11px] font-bold uppercase tracking-[0.06em] text-earn">
                      Earnings
                    </h4>
                    <table className="w-full border-collapse">
                      <tbody>
                        {earnings.map((c) => (
                          <tr key={c.id}>
                            <td className={CELL}>{c.name}</td>
                            <td className={`${CELL} text-right font-mono tabular-nums`}>
                              ₹{inr(c.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div>
                    <h4 className="mb-1 text-[11px] font-bold uppercase tracking-[0.06em] text-deduct">
                      Deductions
                    </h4>
                    <table className="w-full border-collapse">
                      <tbody>
                        {deductions.map((c) => (
                          <tr key={c.id}>
                            <td className={CELL}>{c.name}</td>
                            <td className={`${CELL} text-right font-mono tabular-nums`}>
                              ₹{inr(c.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <h4 className="mt-5 mb-1 text-[11px] font-bold uppercase tracking-[0.06em] text-ash">
                  Month by month
                </h4>
                <table className="w-full border-collapse">
                  <tbody>
                    {data.periods.map((p) => (
                      <tr key={p.id}>
                        <td className={CELL}>{p.period}</td>
                        <td className={`${CELL} text-right font-mono tabular-nums text-mist`}>
                          ₹{inr(p.gross)}
                        </td>
                        <td className={`${CELL} text-right font-mono tabular-nums text-deduct`}>
                          −₹{inr(p.totalDeductions)}
                        </td>
                        <td className={`${CELL} text-right font-mono font-bold tabular-nums`}>
                          ₹{inr(p.net)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </>
        )}
      </div>
    </Overlay>
  );
}
