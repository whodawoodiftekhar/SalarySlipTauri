import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ErrorState } from "@/shared/components/feedback/ErrorState";
import { LoadingRows } from "@/shared/components/feedback/LoadingState";
import { Card, CardHeader } from "@/shared/components/ui/Card";
import { num } from "@/shared/lib/format";
import type { Employee } from "@/shared/types";
import { usePayrollRun } from "../hooks/usePayrollRun";
import { payrollService } from "../services/payrollService";
import {
  AddComponentButton,
  ComponentRows,
  GroupHeading,
} from "./ComponentRows";
import { GeneratedSlip } from "./GeneratedSlip";
import { SlipPreview } from "./SlipPreview";

const DAY_INPUT =
  "w-[92px] rounded-lg border border-line px-[9px] py-[7px] tabular-nums";

export function PayrollEditor({
  emp,
  period,
}: {
  emp: Employee;
  period: string;
}) {
  const navigate = useNavigate();
  const {
    comps,
    res,
    loading,
    error,
    refetch,
    dim,
    setDim,
    dpay,
    setDpay,
    update,
    remove,
    add,
    amountOf,
  } = usePayrollRun(emp);

  const [gen, setGen] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [finalizeError, setFinalizeError] = useState<Error | null>(null);

  const finalize = async () => {
    setFinalizing(true);
    setFinalizeError(null);
    try {
      await payrollService.finalize({
        employeeId: emp.id,
        period,
        daysInMonth: num(dim),
        daysPayable: num(dpay),
        components: comps,
      });
      setGen(true);
    } catch (e) {
      setFinalizeError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setFinalizing(false);
    }
  };

  const backLink = (
    <button
      className="mb-[14px] inline-flex items-center gap-1.5 border-none bg-transparent text-[13px] font-semibold text-ash hover:text-ink"
      onClick={() => navigate("/employees")}
    >
      <ArrowLeft size={15} /> Back to roster
    </button>
  );

  // hold the whole grid back until the structure lands — a half-rendered slip
  // showing ₹0.00 beside a skeleton reads as broken
  if (loading || error) {
    return (
      <>
        {backLink}
        <Card>
          {error ? (
            <ErrorState
              title="Could not load the salary structure"
              error={error}
              onRetry={refetch}
            />
          ) : (
            <LoadingRows rows={7} />
          )}
        </Card>
      </>
    );
  }

  return (
    <>
      {backLink}

      <div className="grid grid-cols-[1.1fr_0.9fr] items-start gap-4 max-pay:grid-cols-1">
        <Card>
          <CardHeader>
            <div>
              <h3 className="m-0 text-[15px] font-[650]">{emp.name}</h3>
              <small className="text-[12px] text-mist">
                {emp.id} · {emp.role} · {emp.dept}
              </small>
            </div>
            <div className="flex gap-[10px]">
              <label className="flex flex-col gap-1 text-[10px] uppercase tracking-[0.06em] text-ash">
                Days in month
                <input
                  className={DAY_INPUT}
                  type="number"
                  value={dim}
                  onChange={(e) => setDim(e.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1 text-[10px] uppercase tracking-[0.06em] text-ash">
                Days payable
                <input
                  className={DAY_INPUT}
                  type="number"
                  value={dpay}
                  onChange={(e) => setDpay(e.target.value)}
                />
              </label>
            </div>
          </CardHeader>

          {res.factor < 1 && (
            <div className="mb-[14px] rounded-lg border border-warn-line bg-warn-bg px-3 py-2 text-[12.5px] text-warn-ink">
              LOP active — prorated components at {(res.factor * 100).toFixed(1)}%
            </div>
          )}

          <GroupHeading tone="earn">Earnings</GroupHeading>
          <ComponentRows
            rows={comps.filter((c) => c.group === "earning")}
            update={update}
            remove={remove}
            amountOf={amountOf}
          />
          <AddComponentButton tone="earn" onClick={() => add("earning")} />

          <GroupHeading tone="deduct" className="mt-5">
            Deductions
          </GroupHeading>
          <ComponentRows
            rows={comps.filter((c) => c.group === "deduction")}
            update={update}
            remove={remove}
            amountOf={amountOf}
          />
          <AddComponentButton tone="deduct" onClick={() => add("deduction")} />
        </Card>

        <div className="flex flex-col gap-3">
          <SlipPreview
            emp={emp}
            res={res}
            dim={dim}
            dpay={dpay}
            period={period}
            finalizing={finalizing}
            onGenerate={finalize}
          />
          {finalizeError && (
            <ErrorState
              title="Could not finalize the payslip"
              error={finalizeError}
              onRetry={finalize}
            />
          )}
        </div>
      </div>

      {gen && (
        <GeneratedSlip
          emp={emp}
          res={res}
          dim={num(dim)}
          dpay={num(dpay)}
          period={period}
          onClose={() => setGen(false)}
        />
      )}
    </>
  );
}
