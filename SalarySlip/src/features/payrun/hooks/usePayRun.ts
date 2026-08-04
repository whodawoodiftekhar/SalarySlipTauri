import { useCallback, useMemo, useState } from "react";
import { useSettings } from "@/features/settings/hooks/useSettings";
import { useAsync } from "@/shared/hooks/useAsync";
import { compute, dayRates } from "@/shared/lib/calc";
import { num, round2 } from "@/shared/lib/format";
import { daysInPeriod, getCurrentPeriod } from "@/shared/lib/periods";
import { payRunService } from "../services/payRunService";
import type { PayRunRow } from "../types";

/**
 * Owns a month-end run: the period setup, who is included, how many days each
 * person is paid for, and the finalize/deliver actions.
 *
 * The server computes the preview, but day-count edits are re-totalled locally
 * with the same engine — a round trip per keystroke across a 50-person roster
 * would be unusable. Finalizing recomputes server-side regardless, so what gets
 * stored never depends on the browser.
 */
export function usePayRun() {
  const { standardDays } = useSettings();

  /**
   * The run opens on the month HR is actually in.
   *
   * This used to prefer the pay period configured in Settings, which silently
   * lags the moment the calendar moves on — in August it still opened on July.
   * That setting is a label other screens show (the dashboard's "Run …" button);
   * it is not a statement about which month wants finalizing next. The
   * per-employee editor already defaults to the current month, so the two
   * screens now agree.
   */
  const [period, setPeriodState] = useState(getCurrentPeriod());
  const [daysInMonthOverride, setDaysInMonthOverride] = useState<string | null>(null);
  /** Per-employee days payable, only for rows HR actually changed. */
  const [days, setDays] = useState<Record<string, string>>({});

  const calendarDays = daysInPeriod(period);
  const daysInMonth = daysInMonthOverride ?? String(calendarDays);

  const setPeriod = useCallback((newPeriod: string) => {
    setPeriodState(newPeriod);
    setDaysInMonthOverride(null);
    // Day counts belong to the period they were entered for, so they cannot
    // carry over: 31 days typed for July is not a valid figure for a 30-day
    // June, and leaving it behind showed a stale count against the new month.
    setDays({});
  }, []);

  const setDaysInMonth = useCallback((val: string) => {
    setDaysInMonthOverride(val);
  }, []);

  /** Tracked as exclusions so employees added later default to included. */
  const [excluded, setExcluded] = useState<string[]>([]);

  const dim = num(daysInMonth) > 0 ? num(daysInMonth) : standardDays;

  const fetcher = useCallback(
    () => payRunService.preview({ period, daysInMonth: dim }),
    [period, dim],
  );
  const { data: preview, loading, error, refetch } = useAsync(fetcher);

  /** Preview rows with local day edits applied. */
  const rows = useMemo<PayRunRow[]>(() => {
    if (!preview) return [];

    return preview.rows.map((row) => {
      const override = days[row.employeeId];
      if (override == null || !row.components) return row;

      const daysPayable = Math.min(Math.max(num(override), 0), row.daysInMonth);
      const res = compute(row.components, row.daysInMonth, daysPayable);

      // same rule the server applies: earnings and PF day-rate unless every
      // line in the structure is marked fixed
      const hasLop = daysPayable < row.daysInMonth;
      const dayRated = hasLop && row.components.some(dayRates);

      return {
        ...row,
        daysPayable,
        lopDays: round2(row.daysInMonth - daysPayable),
        gross: res.gross,
        totalDeductions: res.totalDeductions,
        net: res.net,
        factor: res.factor,
        dayRated,
        lopHasNoEffect: hasLop && !dayRated,
        // a hand-typed day count is no longer "from the register"
        daysFromRegister: false,
      };
    });
  }, [preview, days]);

  const selected = useMemo(
    () => rows.filter((r) => !excluded.includes(r.employeeId)),
    [rows, excluded],
  );

  const totals = useMemo(
    () =>
      selected.reduce(
        (acc, r) => ({
          headcount: acc.headcount + 1,
          gross: round2(acc.gross + r.gross),
          totalDeductions: round2(acc.totalDeductions + r.totalDeductions),
          net: round2(acc.net + r.net),
          replacing: acc.replacing + (r.alreadyFinalized ? 1 : 0),
          missingEmail: acc.missingEmail + (r.hasEmail ? 0 : 1),
          lopWithoutEffect: acc.lopWithoutEffect + (r.lopHasNoEffect ? 1 : 0),
          negativeNet: acc.negativeNet + (r.net < 0 ? 1 : 0),
        }),
        {
          headcount: 0,
          gross: 0,
          totalDeductions: 0,
          net: 0,
          replacing: 0,
          missingEmail: 0,
          lopWithoutEffect: 0,
          negativeNet: 0,
        },
      ),
    [selected],
  );

  const toggle = useCallback(
    (employeeId: string) =>
      setExcluded((prev) =>
        prev.includes(employeeId)
          ? prev.filter((id) => id !== employeeId)
          : [...prev, employeeId],
      ),
    [],
  );

  const toggleAll = useCallback(
    () =>
      setExcluded((prev) =>
        prev.length === 0 ? rows.map((r) => r.employeeId) : [],
      ),
    [rows],
  );

  const setDaysFor = useCallback(
    (employeeId: string, value: string) =>
      setDays((prev) => ({ ...prev, [employeeId]: value })),
    [],
  );

  /**
   * Puts every employee back on the full month.
   *
   * The day count is written explicitly rather than by clearing the drafts, and
   * that is the whole point: an absent draft lets the server fall back to
   * whatever LOP was saved for this period on the per-employee screen, so
   * `setDays({})` would snap straight back to those saved figures instead of the
   * full month. The saved records are left alone — this only overrides them for
   * the run being reviewed, and finalizing is what writes the new counts.
   */
  const resetDays = useCallback(
    () =>
      setDays(
        Object.fromEntries(rows.map((r) => [r.employeeId, String(r.daysInMonth)])),
      ),
    [rows],
  );

  /** True while anyone is paid for less than the full month — the only time a reset does anything. */
  const hasReducedDays = useMemo(
    () => rows.some((r) => r.daysPayable < r.daysInMonth),
    [rows],
  );

  const request = useMemo(
    () => ({
      period,
      daysInMonth: dim,
      employeeIds: selected.map((r) => r.employeeId),
      days: Object.fromEntries(
        Object.entries(days)
          .filter(([id]) => selected.some((r) => r.employeeId === id))
          .map(([id, v]) => [id, num(v)]),
      ),
    }),
    [period, dim, selected, days],
  );

  return {
    period,
    setPeriod,
    daysInMonth,
    setDaysInMonth,
    calendarDays: preview?.calendarDays ?? dim,
    standardDays,
    rows,
    selected,
    excluded,
    totals,
    toggle,
    toggleAll,
    daysDraft: days,
    setDaysFor,
    resetDays,
    hasReducedDays,
    request,
    loading,
    error,
    refetch,
  };
}
