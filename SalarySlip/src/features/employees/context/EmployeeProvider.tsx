import { useCallback, useMemo, useState, type ReactNode } from "react";
import { useRoster } from "@/features/payroll/hooks/useRoster";
import { compute, makeStructure } from "@/shared/lib/calc";
import type { Employee, RosterEntry } from "@/shared/types";
import { employeeService } from "../services/employeeService";
import type { NewEmployeeDto, UpdateEmployeeDto } from "../types";
import { EmployeeContext, type EmployeeContextValue } from "./employeeContext";

/** The month the roster column is headed with — matches GET /payroll/roster. */
const STANDARD_DAYS = 30;

/**
 * Gives a locally echoed employee the payroll figures the table needs.
 *
 * A create or update hands back a bare Employee with no totals on it, so the
 * server's costing for that person is kept where there is one — only the
 * profile fields are refreshed over it. An employee the roster has not returned
 * yet is costed here with the same engine the API uses, rather than guessed at.
 */
const costed = (employee: Employee, roster: RosterEntry[]): RosterEntry => {
  if ("net" in employee) return employee as RosterEntry;

  const server = roster.find((r) => r.id === employee.id);
  if (server) return { ...server, ...employee };

  return {
    ...employee,
    ...compute(makeStructure({ ...employee }), STANDARD_DAYS, STANDARD_DAYS),
  };
};

/**
 * Single source of employee data for the whole app.
 *
 * The list comes from GET /payroll/roster, which returns each employee already
 * costed from their saved structure. After a write the roster is refetched so
 * the DB stays authoritative; a created employee is also echoed locally so the
 * payroll screen can find it before that refetch lands.
 */
export function EmployeeProvider({ children }: { children: ReactNode }) {
  const { roster, loading, error, refetch } = useRoster();

  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<Employee[]>([]);
  const [removed, setRemoved] = useState<string[]>([]);

  const safeRoster = useMemo(
    () => (Array.isArray(roster) ? roster.filter((e): e is RosterEntry => Boolean(e && e.id)) : []),
    [roster],
  );

  const employees = useMemo(() => {
    const list: Employee[] = [];
    const seen = new Set<string>();
    // Unshift newly created first
    for (const e of created) {
      if (e && e.id && !removed.includes(e.id) && !seen.has(e.id)) {
        list.push(e);
        seen.add(e.id);
      }
    }
    // Then add roster items in backend's newest-first order
    for (const e of safeRoster) {
      if (e && e.id && !removed.includes(e.id) && !seen.has(e.id)) {
        list.push(e);
        seen.add(e.id);
      }
    }
    return list;
  }, [safeRoster, created, removed]);

  const visibleRoster = useMemo(() => {
    const list: RosterEntry[] = [];
    const seen = new Set<string>();
    for (const e of created) {
      if (e && e.id && !removed.includes(e.id) && !seen.has(e.id)) {
        list.push(costed(e, safeRoster));
        seen.add(e.id);
      }
    }
    for (const e of safeRoster) {
      if (e && e.id && !removed.includes(e.id) && !seen.has(e.id)) {
        list.push(e);
        seen.add(e.id);
      }
    }
    return list;
  }, [safeRoster, created, removed]);

  const addEmployee = useCallback(
    async (dto: NewEmployeeDto) => {
      setSaving(true);
      try {
        const employee = await employeeService.create(dto);
        setCreated((xs) => [...xs.filter((e) => e.id !== employee.id), employee]);
        setRemoved((xs) => xs.filter((id) => id !== employee.id));
        refetch();
        return employee;
      } finally {
        setSaving(false);
      }
    },
    [refetch],
  );

  const updateEmployee = useCallback(
    async (id: string, patch: UpdateEmployeeDto) => {
      setSaving(true);
      try {
        const employee = await employeeService.update(id, patch);
        setCreated((xs) => [...xs.filter((e) => e.id !== id), employee]);
        refetch();
        return employee;
      } finally {
        setSaving(false);
      }
    },
    [refetch],
  );

  const removeEmployee = useCallback(
    async (id: string) => {
      setSaving(true);
      try {
        await employeeService.remove(id);
        setCreated((xs) => xs.filter((e) => e.id !== id));
        setRemoved((xs) => [...xs, id]);
        refetch();
      } finally {
        setSaving(false);
      }
    },
    [refetch],
  );

  const value = useMemo<EmployeeContextValue>(
    () => ({
      roster: visibleRoster,
      employees,
      loading,
      error,
      refetch,
      saving,
      addEmployee,
      updateEmployee,
      removeEmployee,
    }),
    [
      visibleRoster,
      employees,
      loading,
      error,
      refetch,
      saving,
      addEmployee,
      updateEmployee,
      removeEmployee,
    ],
  );

  return (
    <EmployeeContext.Provider value={value}>{children}</EmployeeContext.Provider>
  );
}
