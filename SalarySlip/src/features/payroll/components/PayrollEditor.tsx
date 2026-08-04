import { ArrowLeft, Check, Loader2, Save } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ErrorState } from "@/shared/components/feedback/ErrorState";
import { LoadingRows } from "@/shared/components/feedback/LoadingState";
import { Button } from "@/shared/components/ui/Button";
import { Card, CardHeader } from "@/shared/components/ui/Card";
import { num } from "@/shared/lib/format";
import { getCurrentPeriod, getRecentPeriods } from "@/shared/lib/periods";
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

// period list lives in shared/lib/periods so the pay run offers the same months

export function PayrollEditor({
  emp,
}: {
  emp: Employee;
  /** Company pay period from settings; the editor tracks its own selection. */
  period: string;
}) {
  const navigate = useNavigate();
  const currentMonth = getCurrentPeriod();
  const [selectedPeriod, setSelectedPeriod] = useState(currentMonth);
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
    updateBulk,
    remove,
    add,
    amountOf,
    saveStructure,
    savingStructure,
    isDirty,
  } = usePayrollRun(emp, selectedPeriod);

  const [gen, setGen] = useState(false);
  const [payslipId, setPayslipId] = useState<string | undefined>();
  const [finalizing, setFinalizing] = useState(false);
  const [finalizeError, setFinalizeError] = useState<Error | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);

  const handleSaveStructure = async () => {
    await saveStructure();
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  const handleBack = async () => {
    if (isDirty) {
      await saveStructure();
    }
    navigate("/employees");
  };

  /**
   * Saves any pending edits and finalizes the slip, resolving with its id.
   *
   * Shared by the Generate button and the Outlook mailer: a payslip has to exist
   * in history before it can be emailed, and re-finalizing the same
   * employee+period overwrites the same document, so calling this twice is safe.
   */
  const finalizeRun = async (): Promise<string> => {
    if (isDirty) {
      await saveStructure();
    }
    const slip = await payrollService.finalize({
      employeeId: emp.id,
      period: selectedPeriod,
      daysInMonth: num(dim),
      daysPayable: num(dpay),
      components: comps,
    });
    setPayslipId(slip.id);
    return slip.id;
  };

  const finalize = async () => {
    setFinalizing(true);
    setFinalizeError(null);
    try {
      await finalizeRun();
      setGen(true);
    } catch (e) {
      setFinalizeError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setFinalizing(false);
    }
  };

  const backLink = (
    <button
      className="mb-[14px] inline-flex items-center gap-1.5 border-none bg-transparent text-[13px] font-semibold text-ash hover:text-ink cursor-pointer"
      onClick={handleBack}
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
            <div className="flex items-center justify-between w-full">
              <div>
                <h3 className="m-0 text-[15px] font-[650]">{emp.name}</h3>
                <small className="text-[12px] text-mist">
                  {emp.id} · {emp.role} · {emp.dept}
                </small>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSaveStructure}
                  disabled={savingStructure || !isDirty}
                  title={
                    isDirty
                      ? "Save structure edits and day counts to database"
                      : "Structure and day counts saved in database"
                  }
                  className="h-8 text-[12px] gap-1.5 px-3"
                >
                  {savingStructure ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : savedNotice ? (
                    <Check size={13} className="text-emerald-600" />
                  ) : (
                    <Save size={13} />
                  )}
                  {savingStructure ? "Saving…" : savedNotice ? "Saved!" : isDirty ? "Save Structure" : "Saved"}
                </Button>
              </div>
            </div>
            <div className="flex gap-[10px] items-center">
              <label className="flex flex-col gap-1 text-[10px] uppercase tracking-[0.06em] text-ash">
                Pay Period
                <select
                  className="rounded-lg border border-line bg-white px-2.5 py-[7px] text-[13px] font-semibold text-ink focus:outline-none focus:ring-1 focus:ring-accent"
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                >
                  {(() => {
                    const recentPeriods = getRecentPeriods(3);
                    const allOptions = recentPeriods.includes(selectedPeriod)
                      ? recentPeriods
                      : [...recentPeriods, selectedPeriod];
                    return allOptions.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ));
                  })()}
                </select>
              </label>
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
            updateBulk={updateBulk}
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
            updateBulk={updateBulk}
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
            period={selectedPeriod}
            finalizing={finalizing}
            onGenerate={finalize}
            ensurePayslip={finalizeRun}
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
          period={selectedPeriod}
          payslipId={payslipId}
          onClose={() => setGen(false)}
        />
      )}
    </>
  );
}
