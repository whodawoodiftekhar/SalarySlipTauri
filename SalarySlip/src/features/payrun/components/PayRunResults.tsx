import {
  CheckCircle2,
  FolderOpen,
  Loader2,
  Mail,
  RotateCcw,
  Save,
  XCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/shared/components/ui/Button";
import { Card, CardHeader, CardTitle } from "@/shared/components/ui/Card";
import { inr, inr0 } from "@/shared/lib/format";
import type { BulkEmailResult, ExportResult, PayRunResult } from "../types";

const TD = "border-b border-hairline p-2.5 align-middle text-[13px]";

const STATUS_LABEL = {
  finalized: { text: "Finalized", className: "text-earn" },
  replaced: { text: "Replaced", className: "text-warn-ink" },
  error: { text: "Failed", className: "text-deduct" },
} as const;

/** What happened, and the two things HR does next: get the PDFs, send them. */
export function PayRunResults({
  result,
  exported,
  emailed,
  busy,
  onExport,
  onOpenFolder,
  onEmailAll,
  onReset,
}: {
  result: PayRunResult;
  exported: ExportResult | null;
  emailed: BulkEmailResult | null;
  busy: "export" | "email" | null;
  onExport: () => void;
  onOpenFolder: () => void;
  onEmailAll: () => void;
  onReset: () => void;
}) {
  const navigate = useNavigate();
  const { summary } = result;
  const emailStatusFor = (employeeId: string) =>
    emailed?.rows.find((r) => r.employeeId === employeeId);

  // mailing writes each attachment into the period folder as well
  const mailedFolder = emailed?.rows.find((r) => r.savedTo)?.savedTo;

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 size={17} className="text-earn" />
              {result.period} run complete
            </span>
          </CardTitle>
          <small className="mt-0.5 block text-[12px] text-mist">
            {summary.finalized} finalized
            {summary.replaced > 0 && `, ${summary.replaced} replaced`}
            {summary.failed > 0 && `, ${summary.failed} failed`} · net{" "}
            <b className="font-mono text-ink">₹{inr0(summary.net)}</b>
          </small>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={onExport} disabled={busy !== null}>
            {busy === "export" ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Save size={15} />
            )}
            Save all PDFs
          </Button>
          {exported && (
            <Button variant="ghost" onClick={onOpenFolder}>
              <FolderOpen size={14} /> Open folder
            </Button>
          )}
          <Button variant="ghost" onClick={onEmailAll} disabled={busy !== null}>
            {busy === "email" ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Mail size={14} />
            )}
            Email all
          </Button>
          <Button variant="ghost" onClick={() => navigate("/payslips")}>
            View in history
          </Button>
          <Button variant="ghost" onClick={onReset}>
            <RotateCcw size={14} /> New run
          </Button>
        </div>
      </CardHeader>

      {exported && (
        <div className="mb-3 rounded-lg border border-earn-soft bg-earn-soft/50 px-3 py-2 text-[12.5px] text-earn">
          Saved {exported.saved.length} PDF{exported.saved.length === 1 ? "" : "s"} to{" "}
          <span className="font-mono">{exported.folder}</span>
          <span className="text-ash">
            {exported.created ? " (folder created)" : " (existing folder updated)"}
          </span>
          {exported.failed.length > 0 && (
            <span className="text-deduct"> · {exported.failed.length} could not be written</span>
          )}
        </div>
      )}

      {emailed && (
        <div className="mb-3 rounded-lg border border-line bg-paper/70 px-3 py-2 text-[12.5px] text-ash">
          Email{emailed.via === "outlook" ? " (via Outlook)" : emailed.via === "smtp" ? " (via SMTP)" : ""}:{" "}
          <b className="text-earn">{emailed.summary.sent} sent</b>
          {emailed.summary.skipped > 0 && (
            <span className="text-warn-ink"> · {emailed.summary.skipped} skipped</span>
          )}
          {emailed.summary.failed > 0 && (
            <span className="text-deduct"> · {emailed.summary.failed} failed</span>
          )}
          {emailed.summary.sent === 0 && emailed.rows[0] && (
            <span className="block text-[12px] text-mist">{emailed.rows[0].message}</span>
          )}
          {mailedFolder && (
            <span className="block text-[12px] text-mist">
              Attached PDFs saved to <span className="font-mono">{mailedFolder}</span>
            </span>
          )}
        </div>
      )}

      <table className="w-full border-collapse max-mob:min-w-[720px]">
        <tbody className="[&>tr:last-child>td]:border-b-0">
          {result.rows.map((row) => {
            const status = STATUS_LABEL[row.status];
            const mail = emailStatusFor(row.employeeId);

            return (
              <tr key={row.employeeId}>
                <td className={TD}>
                  <b>{row.employeeName}</b>
                  <small className="ml-2 text-[11.5px] text-mist">{row.employeeId}</small>
                </td>
                <td className={`${TD} text-right font-mono tabular-nums`}>
                  ₹{inr(row.net)}
                </td>
                <td className={`${TD} text-center text-[12px] font-semibold ${status.className}`}>
                  {status.text}
                </td>
                <td className={`${TD} text-[12px] text-ash`}>
                  {row.message && <span className="text-deduct">{row.message}</span>}
                  {mail && (
                    <span
                      className={
                        mail.success
                          ? "inline-flex items-center gap-1 text-earn"
                          : mail.skipped
                            ? "inline-flex items-center gap-1 text-warn-ink"
                            : "inline-flex items-center gap-1 text-deduct"
                      }
                      title={mail.message}
                    >
                      {mail.success ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                      {mail.success ? `Emailed ${mail.recipient}` : mail.message}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}
