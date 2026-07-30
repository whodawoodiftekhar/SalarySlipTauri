import { useCallback, useMemo, useState, type ReactNode } from "react";
import { useRoster } from "@/features/payroll/hooks/useRoster";
import type { Employee } from "@/shared/types";
import { employeeService } from "../services/employeeService";
import type { NewEmployeeDto, UpdateEmployeeDto } from "../types";
import { EmployeeContext, type EmployeeContextValue } from "./employeeContext";

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

  const employees = useMemo(() => {
    const byId = new Map<string, Employee>();
    for (const e of roster) byId.set(e.id, e);
    for (const e of created) byId.set(e.id, e);
    for (const id of removed) byId.delete(id);
    return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
  }, [roster, created, removed]);

  const visibleRoster = useMemo(
    () => roster.filter((e) => !removed.includes(e.id)),
    [roster, removed],
  );

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
