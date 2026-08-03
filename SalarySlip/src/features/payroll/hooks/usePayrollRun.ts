import { useCallback, useMemo, useState } from "react";
import { useSettings } from "@/features/settings/hooks/useSettings";
import { useAsync } from "@/shared/hooks/useAsync";
import { compute } from "@/shared/lib/calc";
import { num } from "@/shared/lib/format";
import type { ComponentGroup, Employee, SalaryComponent } from "@/shared/types";
import { payrollService } from "../services/payrollService";

/**
 * Loads an employee's stored salary structure, then owns the editable draft of
 * it plus the day counts.
 *
 * Totals are computed locally as HR types — a round trip per keystroke would
 * be unusable — and recomputed server-side on finalize, which is what gets
 * saved. `compute` is deliberately identical on both sides.
 */
export function usePayrollRun(employee: Employee) {
  const { standardDays } = useSettings();

  const fetcher = useCallback(
    () => payrollService.getStructure(employee.id),
    [employee.id],
  );
  const { data, loading, error, refetch } = useAsync(fetcher);

  const [draft, setDraft] = useState<SalaryComponent[] | null>(null);
  const [dim, setDim] = useState(String(standardDays));
  const [dpay, setDpay] = useState(String(standardDays));

  const initialComps = useMemo(() => {
    if (!data) return [];
    return data.map((c) => ({ ...c, prorate: false }));
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
        },
      ]),
    [initialComps],
  );

  const amountOf = useCallback(
    (id: string) =>
      [...res.earnings, ...res.deductions].find((r) => r.id === id)?.amount ?? 0,
    [res],
  );

  return {
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
  };
}
