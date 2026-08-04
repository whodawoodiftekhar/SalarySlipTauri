import {
  CalendarRange,
  Eye,
  FileDown,
  Loader2,
  Mail,
  MailCheck,
  Trash2,
} from "lucide-react";
import { Avatar } from "@/shared/components/ui/Avatar";
import { DeptTag } from "@/shared/components/ui/Badge";
import { initials, inr } from "@/shared/lib/format";
import type { PayslipRecord } from "../types";

const TH =
  "border-b border-line px-3 pb-[10px] text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-mist";
const TD = "border-b border-hairline p-3 align-middle text-[13.5px]";
const ICON_BTN =
  "grid place-items-center rounded-lg border-none bg-transparent p-1.5 text-ash hover:bg-paper hover:text-ink disabled:opacity-40 cursor-pointer";

const shortDate = (value: string | null) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "2-digit",
      })
    : "—";

export type PayslipAction = "view" | "pdf" | "email" | "ytd" | "delete";

export function PayslipTable({
  rows,
  busyId,
  onAction,
}: {
  rows: PayslipRecord[];
  busyId: string | null;
  onAction: (action: PayslipAction, slip: PayslipRecord) => void;
}) {
  return (
    <table className="w-full border-collapse max-mob:min-w-[900px]">
      <thead>
        <tr>
          <th className={TH}>Employee</th>
          <th className={TH}>Period</th>
          <th className={TH}>Department</th>
          <th className={`${TH} text-right`}>Days in month</th>
          <th className={`${TH} text-right`}>Days payable</th>
          <th className={`${TH} text-right`}>Gross</th>
          <th className={`${TH} text-right`}>Deductions</th>
          <th className={`${TH} text-right`}>Net paid</th>
          <th className={TH}>Emailed</th>
          <th className={TH} />
        </tr>
      </thead>
      <tbody className="[&>tr:last-child>td]:border-b-0">
        {rows.map((slip) => {
          const busy = busyId === slip.id;
          const lop = slip.daysPayable < slip.daysInMonth;

          return (
            <tr key={slip.id}>
              <td className={TD}>
                <div className="flex items-center gap-[10px]">
                  <Avatar label={initials(slip.employeeName)} size="sm" />
                  <div>
                    <b className="block">{slip.employeeName}</b>
                    <small className="text-[11.5px] text-mist">
                      {slip.employeeId}
                      {slip.role && <span className="text-slate-400"> · {slip.role}</span>}
                    </small>
                  </div>
                </div>
              </td>
              <td className={TD}>
                <b className="block text-[13px]">{slip.period}</b>
                <small className="text-[11.5px] text-mist">
                  finalized {shortDate(slip.finalizedAt)}
                </small>
              </td>
              <td className={TD}>
                <DeptTag dept={slip.dept || "General"} />
              </td>
              <td className={`${TD} text-right font-mono tabular-nums text-mist`}>
                {slip.daysInMonth}
              </td>
              <td className={`${TD} text-right font-mono tabular-nums`}>
                <span className={lop ? "font-bold text-warn-ink" : undefined}>
                  {slip.daysPayable}
                </span>
              </td>
              <td className={`${TD} text-right font-mono tabular-nums`}>
                ₹{inr(slip.result?.gross)}
              </td>
              <td className={`${TD} text-right font-mono tabular-nums text-deduct`}>
                ₹{inr(slip.result?.totalDeductions)}
              </td>
              <td className={`${TD} text-right font-mono tabular-nums font-bold text-earn`}>
                ₹{inr(slip.result?.net)}
              </td>
              <td className={TD}>
                {slip.emailedAt ? (
                  <span
                    className="inline-flex items-center gap-1 text-[12px] font-semibold text-earn"
                    title={`Sent to ${slip.emailedTo}`}
                  >
                    <MailCheck size={13} /> {shortDate(slip.emailedAt)}
                  </span>
                ) : (
                  <span className="text-[12px] text-mist">Not sent</span>
                )}
              </td>
              <td className={`${TD} text-right`}>
                <div className="inline-flex items-center gap-1">
                  {busy && <Loader2 size={15} className="mr-1 animate-spin text-accent" />}
                  <button
                    className={ICON_BTN}
                    onClick={() => onAction("view", slip)}
                    disabled={busy}
                    title="View the finalized slip"
                    aria-label={`View payslip for ${slip.employeeName}`}
                  >
                    <Eye size={15} />
                  </button>
                  <button
                    className={ICON_BTN}
                    onClick={() => onAction("pdf", slip)}
                    disabled={busy}
                    title="Download the PDF again"
                    aria-label={`Download PDF for ${slip.employeeName}`}
                  >
                    <FileDown size={15} />
                  </button>
                  <button
                    className={ICON_BTN}
                    onClick={() => onAction("email", slip)}
                    disabled={busy || !slip.email}
                    title={
                      slip.email
                        ? `Email this payslip to ${slip.email}`
                        : "No email address on this employee"
                    }
                    aria-label={`Email payslip to ${slip.employeeName}`}
                  >
                    <Mail size={15} />
                  </button>
                  <button
                    className={ICON_BTN}
                    onClick={() => onAction("ytd", slip)}
                    disabled={busy}
                    title="Year-to-date totals"
                    aria-label={`Year to date for ${slip.employeeName}`}
                  >
                    <CalendarRange size={15} />
                  </button>
                  <button
                    className="grid place-items-center rounded-lg border-none bg-transparent p-1.5 text-danger hover:bg-deduct-soft disabled:opacity-40 cursor-pointer"
                    onClick={() => onAction("delete", slip)}
                    disabled={busy}
                    title="Delete this payslip"
                    aria-label={`Delete payslip for ${slip.employeeName}`}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
