import { useCallback, useMemo, useState } from "react";
import { useAsync } from "@/shared/hooks/useAsync";
import { round2 } from "@/shared/lib/format";
import { payslipService } from "../services/payslipService";
import type { PayslipRecord } from "../types";

export interface PayslipFilters {
  period: string;
  dept: string;
  q: string;
}

/**
 * Owns the payslip history list plus its filters.
 *
 * The period filter goes to the server (it narrows an indexed field), while the
 * text and department filters run locally so typing stays instant.
 */
export function usePayslips() {
  const [filters, setFilters] = useState<PayslipFilters>({
    period: "All",
    dept: "All",
    q: "",
  });

  const listFetcher = useCallback(
    () =>
      payslipService.list(
        filters.period === "All" ? {} : { period: filters.period },
      ),
    [filters.period],
  );
  const { data, loading, error, refetch } = useAsync(listFetcher);

  const periodsFetcher = useCallback(() => payslipService.periods(), []);
  const periodsState = useAsync(periodsFetcher);

  const all = useMemo(() => data ?? [], [data]);

  const rows = useMemo(() => {
    const needle = filters.q.trim().toLowerCase();

    return all.filter((slip) => {
      if (filters.dept !== "All" && slip.dept !== filters.dept) return false;
      if (!needle) return true;
      return (
        slip.employeeName.toLowerCase().includes(needle) ||
        slip.employeeId.toLowerCase().includes(needle) ||
        slip.role.toLowerCase().includes(needle)
      );
    });
  }, [all, filters.dept, filters.q]);

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, s) => ({
          count: acc.count + 1,
          gross: round2(acc.gross + (s.result?.gross ?? 0)),
          deductions: round2(acc.deductions + (s.result?.totalDeductions ?? 0)),
          net: round2(acc.net + (s.result?.net ?? 0)),
        }),
        { count: 0, gross: 0, deductions: 0, net: 0 },
      ),
    [rows],
  );

  const depts = useMemo(
    () => ["All", ...new Set(all.map((s) => s.dept).filter(Boolean))],
    [all],
  );

  const patchFilters = useCallback(
    (patch: Partial<PayslipFilters>) => setFilters((f) => ({ ...f, ...patch })),
    [],
  );

  /** Drops one row locally so the table reacts before the refetch lands. */
  const [removed, setRemoved] = useState<string[]>([]);
  const forget = useCallback((id: string) => setRemoved((r) => [...r, id]), []);

  const visible = useMemo(
    () => rows.filter((s) => !removed.includes(s.id)),
    [rows, removed],
  );

  const reload = useCallback(() => {
    setRemoved([]);
    refetch();
    periodsState.refetch();
  }, [refetch, periodsState]);

  return {
    rows: visible as PayslipRecord[],
    totals,
    depts,
    periods: periodsState.data ?? [],
    filters,
    patchFilters,
    loading,
    error,
    reload,
    forget,
  };
}
