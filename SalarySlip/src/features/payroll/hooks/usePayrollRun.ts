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

  const comps = useMemo(() => draft ?? data ?? [], [draft, data]);

  const res = useMemo(
    () => compute(comps, num(dim), num(dpay)),
    [comps, dim, dpay],
  );

  const update = useCallback(
    (id: string, patch: Partial<SalaryComponent>) =>
      setDraft(comps.map((c) => (c.id === id ? { ...c, ...patch } : c))),
    [comps],
  );

  const remove = useCallback(
    (id: string) => setDraft(comps.filter((c) => c.id !== id)),
    [comps],
  );

  const add = useCallback(
    (group: ComponentGroup) =>
      setDraft([
        ...comps,
        {
          id: `c${Date.now()}`,
          name: group === "earning" ? "New earning" : "New deduction",
          group,
          calc: "flat",
          value: 0,
          prorate: group === "earning",
        },
      ]),
    [comps],
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
    remove,
    add,
    amountOf,
  };
}
