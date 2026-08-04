import { useCallback, useMemo, useState } from "react";
import { useAsync } from "@/shared/hooks/useAsync";
import { compute } from "@/shared/lib/calc";
import { num } from "@/shared/lib/format";
import { daysInPeriod } from "@/shared/lib/periods";
import type { ComponentGroup, Employee, SalaryComponent } from "@/shared/types";
import { payrollService } from "../services/payrollService";

interface DayDraft {
  period: string;
  dim: string;
  dpay: string;
}

/**
 * Loads an employee's stored salary structure and the day counts saved for the
 * selected period, then owns the editable draft of both.
 *
 * Totals are computed locally as HR types — a round trip per keystroke would
 * be unusable — and recomputed server-side on finalize, which is what gets
 * saved. `compute` is deliberately identical on both sides.
 *
 * The day counts are per period, not per employee: they used to be plain local
 * state, so leaving the screen reset them to the company standard and the bulk
 * pay run had no idea anyone was on LOP.
 */
export function usePayrollRun(employee: Employee, period: string) {
  const fetcher = useCallback(
    () => payrollService.getStructure(employee.id),
    [employee.id],
  );
  const { data, loading, error, refetch } = useAsync(fetcher);

  const daysFetcher = useCallback(
    () => payrollService.getDays(employee.id, period),
    [employee.id, period],
  );
  const { data: savedDays } = useAsync(daysFetcher);

  const [draft, setDraft] = useState<SalaryComponent[] | null>(null);
  const [dayDraft, setDayDraft] = useState<DayDraft | null>(null);
  /** Day counts written during this session — authoritative over a refetch. */
  const [dayBaseline, setDayBaseline] = useState<DayDraft | null>(null);

  const baseline = useMemo<{ dim: string; dpay: string }>(() => {
    if (dayBaseline?.period === period) return dayBaseline;
    const realDays = daysInPeriod(period);
    return {
      dim: String(savedDays?.daysInMonth ?? realDays),
      dpay: String(savedDays?.daysPayable ?? realDays),
    };
  }, [dayBaseline, period, savedDays]);

  // a draft belongs to the period it was typed against, so switching period
  // falls back to that period's stored counts instead of carrying LOP across
  const activeDays = dayDraft?.period === period ? dayDraft : null;
  const dim = activeDays?.dim ?? baseline.dim;
  const dpay = activeDays?.dpay ?? baseline.dpay;

  const daysDirty =
    activeDays != null &&
    (activeDays.dim !== baseline.dim || activeDays.dpay !== baseline.dpay);

  // No `setDim`: the month's length is not hand-editable on this screen, so a
  // day draft only ever changes `dpay` and carries `dim` through unchanged.
  const setDpay = useCallback(
    (value: string) => setDayDraft({ period, dim, dpay: value }),
    [period, dim],
  );

  /**
   * The stored structure as-is. Both day-rating flags must survive the round
   * trip: `prorate` used to be forced back to false here, so a ticked LOP box
   * silently un-ticked itself after saving — and worse, a finalize after reload
   * computed a full month even though HR had saved the line as day-rated.
   * Legacy rows without either field coerce to false, which leaves earnings
   * day-rated by default.
   */
  const initialComps = useMemo(() => {
    if (!data) return [];
    return data.map((c) => ({
      ...c,
      prorate: Boolean(c.prorate),
      fixed: Boolean(c.fixed),
    }));
  }, [data]);

  const comps = useMemo(() => draft ?? initialComps, [draft, initialComps]);

  const res = useMemo(
    () => compute(comps, num(dim), num(dpay)),
    [comps, dim, dpay],
  );

  const update = useCallback(
    (id: string, patch: Partial<SalaryComponent>) =>
      setDraft((prev) =>
        (prev ?? initialComps).map((c) => (c.id === id ? { ...c, ...patch } : c)),
      ),
    [initialComps],
  );

  const updateBulk = useCallback(
    (ids: string[], patch: Partial<SalaryComponent>) =>
      setDraft((prev) =>
        (prev ?? initialComps).map((c) =>
          ids.includes(c.id) ? { ...c, ...patch } : c,
        ),
      ),
    [initialComps],
  );

  const remove = useCallback(
    (id: string) =>
      setDraft((prev) => (prev ?? initialComps).filter((c) => c.id !== id)),
    [initialComps],
  );

  const add = useCallback(
    (group: ComponentGroup) =>
      setDraft((prev) => [
        ...(prev ?? initialComps),
        {
          id: `c${Date.now()}`,
          name: group === "earning" ? "New earning" : "New deduction",
          group,
          calc: "flat",
          value: 0,
          prorate: false,
          fixed: false,
        },
      ]),
    [initialComps],
  );

  const amountOf = useCallback(
    (id: string) =>
      [...res.earnings, ...res.deductions].find((r) => r.id === id)?.amount ?? 0,
    [res],
  );

  const [savingStructure, setSavingStructure] = useState(false);

  /**
   * Persists whichever of the two actually changed.
   *
   * The day counts are not refetched afterwards — the values just written become
   * the new baseline, so the fields cannot flicker back to the standard days
   * while the request is in flight.
   */
  const saveStructure = useCallback(async () => {
    if (!comps) return;
    setSavingStructure(true);
    try {
      let updated;
      if (draft !== null) {
        updated = await payrollService.saveStructure(employee.id, comps);
        setDraft(null);
        await refetch();
      }

      if (daysDirty) {
        await payrollService.saveDays(employee.id, period, num(dim), num(dpay));
        setDayBaseline({ period, dim, dpay });
      }

      return updated;
    } finally {
      setSavingStructure(false);
    }
  }, [comps, daysDirty, dim, dpay, draft, employee.id, period, refetch]);

  return {
    comps,
    res,
    loading,
    error,
    refetch,
    dim,
    dpay,
    setDpay,
    update,
    updateBulk,
    remove,
    add,
    amountOf,
    saveStructure,
    savingStructure,
    isDirty: draft !== null || daysDirty,
  };
}
