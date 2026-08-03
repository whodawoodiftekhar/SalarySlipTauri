import { Printer, X } from "lucide-react";
import { useState } from "react";
import { useSettings } from "@/features/settings/hooks/useSettings";
import { Button } from "@/shared/components/ui/Button";
import { Overlay } from "@/shared/components/ui/Overlay";
import { LOGO } from "@/shared/lib/branding";
import { inr } from "@/shared/lib/format";
import type { ComputedComponent, Employee, PayrollResult } from "@/shared/types";
import { SendOutlookEmailModal } from "./SendOutlookEmailModal";

const CELL =
  "[&_td]:border [&_td]:border-[#333] [&_td]:px-2.5 [&_td]:py-1.5 [&_td]:print:py-[5px] [&_td]:text-[12px] [&_td]:align-middle";

function MetaRow({
  k1,
  v1,
  k2,
  v2,
}: {
  k1: string;
  v1: string | number;
  k2: string;
  v2: string | number;
}) {
  return (
    <tr>
      <td className="w-[18%] whitespace-nowrap">{k1}</td>
      <td className="w-[32%] font-bold whitespace-nowrap">{v1}</td>
      <td className="w-[18%] whitespace-nowrap">{k2}</td>
      <td className="w-[32%] font-bold whitespace-nowrap">{v2}</td>
    </tr>
  );
}

/** Faithful replica of the printed COMM-IT slip with watermark. */
export function GeneratedSlip({
  emp,
  res,
  dim,
  dpay,
  period,
  onClose,
}: {
  emp: Employee;
  res: PayrollResult;
  dim: number;
  dpay: number;
  period: string;
  onClose: () => void;
}) {
  const { company, slipDefaults } = useSettings();
  const [showEmailModal, setShowEmailModal] = useState(false);

  // pad the shorter column so the grid stays aligned like the printed slip
  const rowN = Math.max(res.earnings.length, res.deductions.length);
  const eRows: (ComputedComponent | null)[] = [...res.earnings];
  const dRows: (ComputedComponent | null)[] = [...res.deductions];
  while (eRows.length < rowN) eRows.push(null);
  while (dRows.length < rowN) dRows.push(null);

  return (
    <Overlay onClose={onClose}>
      <div className="no-print mb-4 flex flex-wrap gap-2.5">
        <Button variant="overlay" onClick={() => window.print()}>
          <Printer size={15} /> Print / Save PDF
        </Button>
        <Button variant="overlayGhost" onClick={onClose}>
          <X size={15} /> Close
        </Button>
      </div>

      {showEmailModal && (
        <SendOutlookEmailModal
          emp={emp}
          res={res}
          period={period}
          onClose={() => setShowEmailModal(false)}
        />
      )}

      <div
        className="paper-wrap relative w-full max-w-[820px] rounded-sm bg-white p-7 shadow-[0_20px_60px_rgba(0,0,0,0.35)] max-mob:p-3"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Background Text Watermark */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-sm select-none flex items-center justify-center opacity-[0.07]">
          <span
            className="rotate-[-30deg] font-extrabold uppercase tracking-[0.2em] text-black font-sans whitespace-nowrap"
            style={{ fontSize: "clamp(48px, 8vw, 90px)", letterSpacing: "0.18em" }}
          >
            {company.watermarkText !== undefined ? company.watermarkText : (company.name || "COMM-IT")}
          </span>
        </div>

        <div className="relative z-10 font-[Arial,Helvetica,sans-serif] text-[#111]">
          <table className={`w-full border-collapse border border-[#333] ${CELL}`}>
            <tbody>
              {/* Header block */}
              <tr>
                <td className="w-[22%] text-center p-2.5" rowSpan={2}>
                  <img
                    src={company.logoUrl || LOGO}
                    alt={company.name}
                    className="mx-auto h-auto max-h-16 w-full max-w-[130px] object-contain"
                  />
                </td>

                <td className="text-[12px] leading-[1.4] text-[#111]" colSpan={3}>
                  <b className="text-[13.5px] font-bold block">{company.legalName}</b>
                  {company.addressLines.map((line) => (
                    <span key={line} className="block">
                      {line}
                    </span>
                  ))}
                </td>
              </tr>
              <tr>
                <td className="text-center text-[13.5px] font-bold bg-gray-50/50" colSpan={3}>
                  Pay Slip - {period}
                </td>
              </tr>

              {/* Employee metadata */}
              <MetaRow
                k1="Employee Name"
                v1={emp.name}
                k2="Designation"
                v2={emp.role}
              />
              <MetaRow
                k1="Employee Code"
                v1={emp.id}
                k2="Bank Name"
                v2={emp.bankName || slipDefaults.bankName}
              />
              <MetaRow
                k1="Department"
                v1={emp.dept}
                k2="Bank Account No."
                v2={emp.bankAccountNo || slipDefaults.bankAccountNo}
              />
              <MetaRow
                k1="Date of Joining"
                v1={emp.doj || "01-Jan-2024"}
                k2="PF Account No."
                v2={emp.pfAccountNo || slipDefaults.pfAccountNo}
              />
              <MetaRow
                k1="PAN Number"
                v1={emp.pan || "ABCDE1234F"}
                k2="UAN Number"
                v2={emp.uan || "101234567890"}
              />
              <MetaRow
                k1="Days in Month"
                v1={dim}
                k2="Days Payable"
                v2={dpay}
              />

              {/* Components banner */}
              <tr>
                <td
                  className="bg-gray-100 text-center text-[13px] font-bold uppercase tracking-wide"
                  colSpan={4}
                >
                  Components
                </td>
              </tr>
              <tr className="[&>td]:bg-gray-50 [&>td]:font-bold [&>td]:text-[12px]">
                <td className="w-[30%]">Earnings</td>
                <td className="w-[20%] text-right">Amount (In Rs.)</td>
                <td className="w-[30%]">Deductions</td>
                <td className="w-[20%] text-right">Amount (In Rs.)</td>
              </tr>

              {/* Earnings & Deductions lines */}
              {Array.from({ length: rowN }).map((_, i) => (
                <tr key={i}>
                  <td className="text-left">{eRows[i]?.name ?? ""}</td>
                  <td className="text-right font-mono tabular-nums">
                    {eRows[i] ? inr(eRows[i].amount) : ""}
                  </td>
                  <td className="text-left">{dRows[i]?.name ?? ""}</td>
                  <td className="text-right font-mono tabular-nums">
                    {dRows[i] ? inr(dRows[i].amount) : ""}
                  </td>
                </tr>
              ))}

              {/* Totals */}
              <tr>
                <td className="text-left font-bold">Total Earnings (A)</td>
                <td className="text-right font-mono font-bold tabular-nums">
                  {inr(res.gross)}
                </td>
                <td className="text-left bg-gray-50/30" />
                <td className="text-right bg-gray-50/30" />
              </tr>
              <tr>
                <td className="text-left bg-gray-50/30" />
                <td className="text-right bg-gray-50/30" />
                <td className="text-left font-bold">Total Deductions (B)</td>
                <td className="text-right font-mono font-bold tabular-nums">
                  {inr(res.totalDeductions)}
                </td>
              </tr>
              <tr>
                <td className="text-left bg-gray-50/30" />
                <td className="text-right bg-gray-50/30" />
                <td className="text-left font-extrabold text-[13.5px]">Net Salary</td>
                <td className="text-right font-mono font-extrabold text-[13.5px] tabular-nums">
                  {inr(res.net)}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Footer Note */}
          <div className="mt-2.5 text-[11.5px] text-[#333] font-normal">
            {slipDefaults?.footNote || "This is a computer generated salary slip and does not require signature"}
          </div>
        </div>
      </div>

      {showEmailModal && (
        <SendOutlookEmailModal
          emp={emp}
          res={res}
          period={period}
          onClose={() => setShowEmailModal(false)}
        />
      )}
    </Overlay>
  );
}
