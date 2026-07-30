import { Printer, X } from "lucide-react";
import { useSettings } from "@/features/settings/hooks/useSettings";
import { Button } from "@/shared/components/ui/Button";
import { Overlay } from "@/shared/components/ui/Overlay";
import { LOGO } from "@/shared/lib/branding";
import { inr } from "@/shared/lib/format";
import type { ComputedComponent, Employee, PayrollResult } from "@/shared/types";

const CELL =
  "[&_td]:border [&_td]:border-[#444] [&_td]:px-2.5 [&_td]:py-[7px] [&_td]:text-[13px] [&_td]:align-middle";

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
      <td className="w-[18%]">{k1}</td>
      <td className="w-[30%] font-semibold">{v1}</td>
      <td className="w-[18%]">{k2}</td>
      <td className="w-[30%] font-semibold">{v2}</td>
    </tr>
  );
}

/** Faithful replica of the printed COMM-IT slip. */
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

  // pad the shorter column so the grid stays aligned like the printed slip
  const rowN = Math.max(res.earnings.length, res.deductions.length);
  const eRows: (ComputedComponent | null)[] = [...res.earnings];
  const dRows: (ComputedComponent | null)[] = [...res.deductions];
  while (eRows.length < rowN) eRows.push(null);
  while (dRows.length < rowN) dRows.push(null);

  return (
    <Overlay onClose={onClose}>
      <div className="no-print mb-4 flex gap-2.5">
        <Button variant="overlay" onClick={() => window.print()}>
          <Printer size={15} /> Print / Save PDF
        </Button>
        <Button variant="overlayGhost" onClick={onClose}>
          <X size={15} /> Close
        </Button>
      </div>

      <div
        className="paper-wrap w-full max-w-[820px] rounded-md bg-white p-[34px] shadow-[0_20px_60px_rgba(0,0,0,0.35)] max-mob:p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="font-[Arial,Helvetica,sans-serif] text-[#111]">
          <table className={`w-full border-collapse border-2 border-[#222] ${CELL}`}>
            <tbody>
              {/* header */}
              <tr>
                <td className="w-[18%] text-center" rowSpan={2}>
                  <img
                    src={LOGO}
                    alt={company.name}
                    className="mx-auto h-auto w-full max-w-[120px]"
                  />
                </td>
                <td className="text-[12.5px] leading-[1.5]" colSpan={3}>
                  <b className="text-[13.5px]">{company.legalName}</b>
                  {company.addressLines.map((line) => (
                    <span key={line}>
                      <br />
                      {line}
                    </span>
                  ))}
                </td>
              </tr>
              <tr>
                <td className="text-center text-[14px] font-bold" colSpan={3}>
                  Pay Slip - {period}
                </td>
              </tr>

              {/* meta */}
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
                v2={slipDefaults.bankName}
              />
              <MetaRow
                k1="Department"
                v1={emp.dept}
                k2="Bank Account No."
                v2={slipDefaults.bankAccountNo}
              />
              <MetaRow
                k1="Days in Month"
                v1={dim}
                k2="PF Account No."
                v2={slipDefaults.pfAccountNo}
              />
              <MetaRow k1="Days Payable" v1={dpay} k2="" v2="" />

              {/* components banner */}
              <tr>
                <td
                  className="bg-[#f2f2f2] text-center text-[13.5px] font-bold"
                  colSpan={4}
                >
                  Components
                </td>
              </tr>
              <tr className="[&>td]:bg-[#fafafa] [&>td]:text-center [&>td]:font-bold">
                <td>Earnings</td>
                <td>Amount (In Rs.)</td>
                <td>Deductions</td>
                <td>Amount (In Rs.)</td>
              </tr>

              {Array.from({ length: rowN }).map((_, i) => (
                <tr key={i}>
                  <td className="text-left">{eRows[i]?.name ?? ""}</td>
                  <td className="text-left tabular-nums">
                    {eRows[i] ? inr(eRows[i].amount) : ""}
                  </td>
                  <td className="text-left">{dRows[i]?.name ?? ""}</td>
                  <td className="text-left tabular-nums">
                    {dRows[i] ? inr(dRows[i].amount) : ""}
                  </td>
                </tr>
              ))}

              {/* totals */}
              <tr>
                <td className="text-left font-bold">Total Earnings (A)</td>
                <td className="text-left font-bold tabular-nums">
                  {inr(res.gross)}
                </td>
                <td className="text-left" />
                <td className="text-left" />
              </tr>
              <tr>
                <td className="text-left" />
                <td className="text-left" />
                <td className="text-left font-bold">Total Deductions (B)</td>
                <td className="text-left font-bold tabular-nums">
                  {inr(res.totalDeductions)}
                </td>
              </tr>
              <tr>
                <td className="text-left" />
                <td className="text-left" />
                <td className="text-left font-bold">Net Salary</td>
                <td className="text-left font-bold tabular-nums">
                  {inr(res.net)}
                </td>
              </tr>
            </tbody>
          </table>
          <div className="mt-2 text-[12px] text-[#333]">
            {slipDefaults.footNote}
          </div>
        </div>
      </div>
    </Overlay>
  );
}
