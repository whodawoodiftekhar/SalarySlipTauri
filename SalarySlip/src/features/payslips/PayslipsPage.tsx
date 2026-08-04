import {
  CheckCircle2,
  FileText,
  FolderOpen,
  Info,
  Loader2,
  RefreshCw,
  Save,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { useEmployees } from "@/features/employees/hooks/useEmployees";
import { GeneratedSlip } from "@/features/payroll/components/GeneratedSlip";
import { EmptyState, ErrorState } from "@/shared/components/feedback/ErrorState";
import { LoadingRows } from "@/shared/components/feedback/LoadingState";
import { Button } from "@/shared/components/ui/Button";
import { Card, CardHeader, CardTitle } from "@/shared/components/ui/Card";
import { SearchInput } from "@/shared/components/ui/SearchInput";
import { inr0 } from "@/shared/lib/format";
import type { Employee } from "@/shared/types";
import { PayslipTable, type PayslipAction } from "./components/PayslipTable";
import { YtdModal } from "./components/YtdModal";
import { usePayslips } from "./hooks/usePayslips";
import { payslipService } from "./services/payslipService";
import type { PayslipRecord } from "./types";

const SELECT =
  "rounded-lg border border-line bg-white px-2.5 py-[7px] text-[13px] font-semibold text-ink focus:outline-none focus:ring-1 focus:ring-accent";

type Notice = {
  tone: "ok" | "warn" | "bad";
  text: string;
  /** when set, the notice offers to reveal this folder in Explorer */
  folder?: string;
};

/**
 * Reconstructs the Employee shape the printed slip component needs.
 *
 * Bank and PF identifiers live on the employee record, not on the snapshot, so
 * they are looked up live; a slip for a since-deleted employee still opens with
 * the name and totals it was finalized with.
 */
const employeeFor = (slip: PayslipRecord, roster: Employee[]): Employee =>
  roster.find((e) => e.id === slip.employeeId) ?? {
    id: slip.employeeId,
    name: slip.employeeName,
    email: slip.email,
    dept: slip.dept,
    role: slip.role,
    basic: 0,
    special: 0,
    tds: 0,
    onsite: 0,
  };

export default function PayslipsPage() {
  const { roster } = useEmployees();
  const { rows, totals, depts, periods, filters, patchFilters, loading, error, reload, forget } =
    usePayslips();

  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [viewing, setViewing] = useState<PayslipRecord | null>(null);
  const [ytdFor, setYtdFor] = useState<PayslipRecord | null>(null);
  const [exporting, setExporting] = useState(false);

  /**
   * Saves every row currently in view — so the period and department filters
   * decide what gets exported. Slips from different periods land in their own
   * folders under Downloads.
   */
  const exportVisible = async () => {
    setExporting(true);
    setNotice(null);
    try {
      const out = await payslipService.exportPdfs(rows.map((r) => r.id));
      const failedNote =
        out.failed.length > 0 ? ` ${out.failed.length} could not be written.` : "";

      setNotice({
        tone: out.failed.length > 0 ? "warn" : "ok",
        folder: out.folder,
        text: `Saved ${out.saved.length} PDF${out.saved.length === 1 ? "" : "s"} to ${out.folder}${
          out.folders.length > 1 ? ` (${out.folders.length} period folders)` : ""
        } — ${out.created ? "folder created" : "existing folder updated"}.${failedNote}`,
      });
    } catch (e) {
      setNotice({
        tone: "bad",
        text: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setExporting(false);
    }
  };

  const revealFolder = async (folder: string) => {
    try {
      await payslipService.openFolder(folder);
    } catch (e) {
      setNotice({
        tone: "bad",
        text: e instanceof Error ? e.message : String(e),
      });
    }
  };

  const handleAction = async (action: PayslipAction, slip: PayslipRecord) => {
    if (action === "view") return setViewing(slip);
    if (action === "ytd") return setYtdFor(slip);

    if (action === "delete") {
      const ok = window.confirm(
        `Delete the ${slip.period} payslip for ${slip.employeeName}?\n\nThe stored snapshot is removed. You can finalize the period again from the payroll screen.`,
      );
      if (!ok) return;
    }

    setBusyId(slip.id);
    setNotice(null);

    try {
      if (action === "pdf") {
        const filename = await payslipService.reprint(slip);
        setNotice({ tone: "ok", text: `Saved ${filename} to your Downloads folder.` });
      }

      if (action === "email") {
        const outcome = await payslipService.email(slip.id);
        setNotice({
          tone: outcome.success ? "ok" : outcome.skipped ? "warn" : "bad",
          folder: outcome.savedTo,
          text: outcome.savedTo
            ? `${outcome.message} PDF saved to ${outcome.savedTo}.`
            : outcome.message,
        });
        if (outcome.success) reload();
      }

      if (action === "delete") {
        await payslipService.remove(slip.id);
        forget(slip.id);
        setNotice({
          tone: "ok",
          text: `Deleted the ${slip.period} payslip for ${slip.employeeName}.`,
        });
      }
    } catch (e) {
      setNotice({
        tone: "bad",
        text: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setBusyId(null);
    }
  };

  const NoticeIcon =
    notice?.tone === "ok" ? CheckCircle2 : notice?.tone === "warn" ? Info : XCircle;

  return (
    <>
      <Card>
        <CardHeader>
          <div>
            <CardTitle>
              <span className="inline-flex items-center gap-2">
                <FileText size={17} className="text-accent" /> Payslip history
              </span>
            </CardTitle>
            <small className="mt-0.5 block text-[12px] text-mist">
              Every finalized slip, reprinted from the snapshot it was approved with.
            </small>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <SearchInput
              value={filters.q}
              onChange={(q) => patchFilters({ q })}
              placeholder="Search name, code or role…"
            />
            <select
              className={SELECT}
              value={filters.period}
              onChange={(e) => patchFilters({ period: e.target.value })}
              aria-label="Filter by pay period"
            >
              <option value="All">All periods</option>
              {periods.map((p) => (
                <option key={p.period} value={p.period}>
                  {p.period} ({p.count})
                </option>
              ))}
            </select>
            <select
              className={SELECT}
              value={filters.dept}
              onChange={(e) => patchFilters({ dept: e.target.value })}
              aria-label="Filter by department"
            >
              {depts.map((d) => (
                <option key={d} value={d}>
                  {d === "All" ? "All departments" : d}
                </option>
              ))}
            </select>
            <Button
              onClick={exportVisible}
              disabled={exporting || loading || rows.length === 0}
              title={
                rows.length === 0
                  ? "Nothing to export"
                  : `Save ${rows.length} PDF${rows.length === 1 ? "" : "s"} to a folder in Downloads`
              }
            >
              {exporting ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Save size={15} />
              )}
              {exporting ? `Saving ${rows.length}…` : "Save all PDFs"}
            </Button>
            <Button variant="ghost" onClick={reload} title="Reload from the database">
              <RefreshCw size={14} /> Refresh
            </Button>
          </div>
        </CardHeader>

        {notice && (
          <div
            className={`mb-3 flex items-start gap-2 rounded-lg border px-3 py-2 text-[12.5px] ${
              notice.tone === "ok"
                ? "border-earn-soft bg-earn-soft/50 text-earn"
                : notice.tone === "warn"
                  ? "border-warn-line bg-warn-bg text-warn-ink"
                  : "border-deduct-soft bg-deduct-soft/50 text-deduct"
            }`}
          >
            <NoticeIcon size={15} className="mt-[1px] flex-none" />
            <span className="flex-1">{notice.text}</span>
            {notice.folder && (
              <button
                className="inline-flex flex-none items-center gap-1 border-none bg-transparent font-semibold underline cursor-pointer"
                onClick={() => revealFolder(notice.folder!)}
              >
                <FolderOpen size={13} /> Open folder
              </button>
            )}
          </div>
        )}

        {loading ? (
          <LoadingRows rows={6} />
        ) : error ? (
          <ErrorState
            title="Could not load the payslip history"
            error={error}
            onRetry={reload}
          />
        ) : rows.length === 0 ? (
          <EmptyState
            message={
              filters.period === "All" && !filters.q && filters.dept === "All"
                ? "No payslips have been finalized yet. Run a pay period to fill this in."
                : "No payslips match these filters."
            }
          />
        ) : (
          <>
            <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-1 rounded-lg bg-paper/70 px-3 py-2 text-[12.5px] text-ash">
              <span>
                <b className="text-ink">{totals.count}</b> slip{totals.count === 1 ? "" : "s"}
              </span>
              <span>
                Gross <b className="font-mono text-ink">₹{inr0(totals.gross)}</b>
              </span>
              <span>
                Deductions <b className="font-mono text-deduct">₹{inr0(totals.deductions)}</b>
              </span>
              <span>
                Net paid <b className="font-mono text-earn">₹{inr0(totals.net)}</b>
              </span>
            </div>

            <PayslipTable rows={rows} busyId={busyId} onAction={handleAction} />
          </>
        )}
      </Card>

      {viewing && (
        <GeneratedSlip
          emp={employeeFor(viewing, roster)}
          res={viewing.result}
          dim={viewing.daysInMonth}
          dpay={viewing.daysPayable}
          period={viewing.period}
          payslipId={viewing.id}
          onClose={() => setViewing(null)}
        />
      )}

      {ytdFor && (
        <YtdModal
          employeeId={ytdFor.employeeId}
          employeeName={ytdFor.employeeName}
          onClose={() => setYtdFor(null)}
        />
      )}
    </>
  );
}
