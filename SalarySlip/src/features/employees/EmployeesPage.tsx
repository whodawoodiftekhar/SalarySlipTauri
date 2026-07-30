import { Plus } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { EmptyState, ErrorState } from "@/shared/components/feedback/ErrorState";
import { LoadingRows } from "@/shared/components/feedback/LoadingState";
import { Button } from "@/shared/components/ui/Button";
import { Card, CardHeader, CardTitle } from "@/shared/components/ui/Card";
import { SearchInput } from "@/shared/components/ui/SearchInput";
import type { RosterEntry } from "@/shared/types";
import { AddEmployeeModal } from "./components/AddEmployeeModal";
import { EmployeeTable } from "./components/EmployeeTable";
import { useEmployees } from "./hooks/useEmployees";

export default function EmployeesPage() {
  const { roster, loading, error, refetch, addEmployee, removeEmployee, saving } =
    useEmployees();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);
  const [deleteError, setDeleteError] = useState<Error | null>(null);

  const rows = roster.filter((e) =>
    (e.name + e.id + e.dept + e.role).toLowerCase().includes(q.toLowerCase()),
  );

  const handleDelete = async (employee: RosterEntry) => {
    const ok = window.confirm(
      `Delete ${employee.name} (${employee.id})?\n\nTheir salary structure and all saved payslips are removed too. This cannot be undone.`,
    );
    if (!ok) return;

    setDeleteError(null);
    try {
      await removeEmployee(employee.id);
    } catch (e) {
      setDeleteError(e instanceof Error ? e : new Error(String(e)));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Employee roster</CardTitle>
        <div className="flex flex-wrap items-center gap-2.5">
          <SearchInput
            value={q}
            onChange={setQ}
            placeholder="Search name, code, department…"
          />
          <Button size="sm" onClick={() => setAdding(true)} disabled={loading}>
            <Plus size={14} /> Add employee
          </Button>
        </div>
      </CardHeader>

      {deleteError && (
        <div className="mb-4">
          <ErrorState title="Could not delete" error={deleteError} />
        </div>
      )}

      {loading ? (
        <LoadingRows rows={6} />
      ) : error ? (
        <ErrorState
          title="Could not load the roster"
          error={error}
          onRetry={refetch}
        />
      ) : rows.length === 0 ? (
        <EmptyState
          message={
            q ? "No employees match that search." : "No employees yet — add one."
          }
        />
      ) : (
        <EmployeeTable
          rows={rows}
          busy={saving}
          onSelect={(e) => navigate(`/payroll/${e.id}`)}
          onDelete={handleDelete}
        />
      )}

      {adding && (
        <AddEmployeeModal
          saving={saving}
          onCancel={() => setAdding(false)}
          onSave={async (dto) => {
            const employee = await addEmployee(dto);
            setAdding(false);
            navigate(`/payroll/${employee.id}`);
          }}
        />
      )}
    </Card>
  );
}
