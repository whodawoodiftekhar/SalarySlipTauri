import { useCallback } from "react";
import { useAsync } from "@/shared/hooks/useAsync";
import type { RosterEntry } from "@/shared/types";
import { payrollService } from "../services/payrollService";

/**
 * Standard-month payroll for every employee, computed by the API from each
 * employee's *saved* structure — so edits made on the payroll screen show up
 * in the roster and on the dashboard.
 */
export function useRoster() {
  const fetcher = useCallback(() => payrollService.getRoster(), []);
  const { data, loading, error, refetch } = useAsync(fetcher);
  return { roster: (data ?? []) as RosterEntry[], loading, error, refetch };
}
