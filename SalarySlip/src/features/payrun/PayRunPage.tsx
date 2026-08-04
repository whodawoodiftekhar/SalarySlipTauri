import {
  AlertTriangle,
  CalendarDays,
  FileText,
  Loader2,
  PlayCircle,
  RotateCcw,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { EmptyState, ErrorState } from "@/shared/components/feedback/ErrorState";
import { LoadingRows } from "@/shared/components/feedback/LoadingState";
import { Button } from "@/shared/components/ui/Button";
import { Card, CardHeader, CardTitle } from "@/shared/components/ui/Card";
import { inr0 } from "@/shared/lib/format";
import { PERIOD_OPTIONS } from "@/shared/lib/periods";
import { PayRunResults } from "./components/PayRunResults";
import { PayRunTable } from "./components/PayRunTable";
import { usePayRun } from "./hooks/usePayRun";
import { payRunService } from "./services/payRunService";
import type { BulkEmailResult, ExportResult, PayRunResult } from "./types";

const SELECT =
  "rounded-lg border border-line bg-white px-2.5 py-[7px] text-[13px] font-semibold text-ink focus:outline-none focus:ring-1 focus:ring-accent";

export default function PayRunPage() {
  const run = usePayRun();
  const navigate = useNavigate();

  const [finalizing, setFinalizing] = useState(false);
  const [result, setResult] = useState<PayRunResult | null>(null);
  const [exported, setExported] = useState<ExportResult | null>(null);
  const [emailed, setEmailed] = useState<BulkEmailResult | null>(null);
  const [busy, setBusy] = useState<"export" | "email" | null>(null);
  const [actionError, setActionError] = useState<Error | null>(null);

  const asError = (e: unknown) => (e instanceof Error ? e : new Error(String(e)));

  const finalize = async () => {
    const replacing = run.totals.replacing;
    const confirmed = window.confirm(
      replacing > 0
        ? `Finalize ${run.totals.headcount} payslips for ${run.period}?\n\n${replacing} employee${replacing === 1 ? " already has" : "s already have"} a slip for this period — those will be overwritten.`
        : `Finalize ${run.totals.headcount} payslips for ${run.period}?`,
    );
    if (!confirmed) return;

    setFinalizing(true);
    setActionError(null);
    try {
      setResult(await payRunService.finalize(run.request));
    } catch (e) {
      setActionError(asError(e));
    } finally {
      setFinalizing(false);
    }
  };

  const exportPdfs = async () => {
    if (!result) return;
    setBusy("export");
    setActionError(null);
    try {
      setExported(
        await payRunService.exportPdfs(
          result.period,
          result.rows.filter((r) => r.payslipId).map((r) => r.employeeId),
        ),
      );
    } catch (e) {
      setActionError(asError(e));
    } finally {
      setBusy(null);
    }
  };

  const openFolder = async () => {
    if (!exported) return;
    try {
      await payRunService.openFolder(exported.folder);
    } catch (e) {
      setActionError(asError(e));
    }
  };

  const emailAll = async () => {
    if (!result) return;
    const recipients = result.rows.filter((r) => r.payslipId && r.hasEmail);
    if (
      !window.confirm(
        `Send ${recipients.length} payslip${recipients.length === 1 ? "" : "s"} for ${result.period}?\n\n` +
          "Each employee gets their own mail with the PDF attached. If no SMTP password is configured, " +
          "these go out through your signed-in desktop Outlook — they are sent, not left as drafts.",
      )
    ) {
      return;
    }

    setBusy("email");
    setActionError(null);
    try {
      setEmailed(
        await payRunService.emailAll(
          result.period,
          recipients.map((r) => r.employeeId),
        ),
      );
    } catch (e) {
      setActionError(asError(e));
    } finally {
      setBusy(null);
    }
  };

  const reset = () => {
    setResult(null);
    setExported(null);
    setEmailed(null);
    setActionError(null);
    run.refetch();
  };

  if (result) {
    return (
      <div className="flex flex-col gap-3">
        <PayRunResults
          result={result}
          exported={exported}
          emailed={emailed}
          busy={busy}
          onExport={exportPdfs}
          onOpenFolder={openFolder}
          onEmailAll={emailAll}
          onReset={reset}
        />
        {actionError && (
          <ErrorState title="That step did not finish" error={actionError} />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>
              <span className="inline-flex items-center gap-2">
                <PlayCircle size={17} className="text-accent" /> Month-end pay run
              </span>
            </CardTitle>
            <small className="mt-0.5 block text-[12px] text-mist">
              Review everyone for a period, then finalize the whole roster in one pass.
            </small>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-ash">
              Pay period
              <select
                className={SELECT}
                value={run.period}
                onChange={(e) => run.setPeriod(e.target.value)}
              >
                {!PERIOD_OPTIONS.includes(run.period) && (
                  <option value={run.period}>{run.period}</option>
                )}
                {PERIOD_OPTIONS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-ash">
              Days in month
              <input
                type="number"
                min={1}
                className="w-[92px] rounded-lg border border-line px-[9px] py-[7px] tabular-nums focus:border-accent focus:outline-none"
                value={run.daysInMonth}
                onChange={(e) => run.setDaysInMonth(e.target.value)}
              />
            </label>

            {run.calendarDays !== Number(run.daysInMonth) && (
              <button
                className="mb-[7px] inline-flex items-center gap-1 border-none bg-transparent text-[12px] font-semibold text-accent hover:underline cursor-pointer"
                onClick={() => run.setDaysInMonth(String(run.calendarDays))}
                title={`${run.period} actually has ${run.calendarDays} days`}
              >
                <CalendarDays size={13} /> Use {run.calendarDays}
              </button>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/payslips")}
              title="Open the payslip history"
            >
              <FileText size={14} /> View in History
            </Button>
          </div>
        </CardHeader>

        {Object.keys(run.daysDraft).length > 0 && (
          <div className="flex items-center justify-end rounded-lg bg-paper/70 px-3 py-2">
            <Button variant="ghost" onClick={run.resetDays}>
              <RotateCcw size={13} /> Reset day counts
            </Button>
          </div>
        )}

        {run.totals.negativeNet > 0 && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-deduct-soft bg-deduct-soft/40 px-3 py-2 text-[12.5px] text-deduct">
            <AlertTriangle size={15} className="mt-[1px] flex-none" />
            <span>
              {run.totals.negativeNet} selected employee
              {run.totals.negativeNet === 1 ? " has" : "s have"} deductions larger than
              earnings for these days, so their net pay is negative. Check the day counts
              and any flat deductions such as TDS before finalizing.
            </span>
          </div>
        )}

        {run.totals.lopWithoutEffect > 0 && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-warn-line bg-warn-bg px-3 py-2 text-[12.5px] text-warn-ink">
            <AlertTriangle size={15} className="mt-[1px] flex-none" />
            <span>
              {run.totals.lopWithoutEffect} employee
              {run.totals.lopWithoutEffect === 1 ? "" : "s"} pay fewer days but nothing
              in their structure is marked prorate, so their pay is unchanged. Open that
              employee from Employees, tick LOP on the lines that should be day-rated,
              and save — this run will pick it up.
            </span>
          </div>
        )}

        <div className="mt-4">
          {run.loading ? (
            <LoadingRows rows={6} />
          ) : run.error ? (
            <ErrorState
              title="Could not build the pay run"
              error={run.error}
              onRetry={run.refetch}
            />
          ) : run.rows.length === 0 ? (
            <EmptyState message="No employees on the roster yet — add employees first." />
          ) : (
            <PayRunTable
              rows={run.rows}
              excluded={run.excluded}
              daysDraft={run.daysDraft}
              onToggle={run.toggle}
              onToggleAll={run.toggleAll}
              onDaysChange={run.setDaysFor}
            />
          )}
        </div>
      </Card>

      {run.rows.length > 0 && !run.loading && !run.error && (
        <Card className="sticky bottom-3 flex flex-wrap items-center justify-between gap-4 border-accent-ring shadow-[0_8px_28px_rgba(20,23,31,0.10)]">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-[12.5px] text-ash">
            <span>
              <b className="text-[15px] text-ink">{run.totals.headcount}</b> selected
              {run.excluded.length > 0 && (
                <span className="text-mist"> of {run.rows.length}</span>
              )}
            </span>
            <span>
              Gross <b className="font-mono text-ink">₹{inr0(run.totals.gross)}</b>
            </span>
            <span>
              Deductions{" "}
              <b className="font-mono text-deduct">₹{inr0(run.totals.totalDeductions)}</b>
            </span>
            <span>
              Net payout <b className="font-mono text-[15px] text-earn">₹{inr0(run.totals.net)}</b>
            </span>
            {run.totals.replacing > 0 && (
              <span className="text-warn-ink">
                {run.totals.replacing} will replace an existing slip
              </span>
            )}
          </div>

          <Button
            onClick={finalize}
            disabled={finalizing || run.totals.headcount === 0}
            title={
              run.totals.headcount === 0
                ? "Select at least one employee"
                : `Finalize ${run.totals.headcount} payslips`
            }
          >
            {finalizing ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <PlayCircle size={15} />
            )}
            {finalizing
              ? "Finalizing…"
              : `Finalize ${run.totals.headcount} payslip${run.totals.headcount === 1 ? "" : "s"}`}
          </Button>
        </Card>
      )}

      {actionError && <ErrorState title="Could not finalize the run" error={actionError} />}
    </div>
  );
}
