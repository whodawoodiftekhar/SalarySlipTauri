import { FileSpreadsheet, Filter, Plus } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSettings } from "@/features/settings/hooks/useSettings";
import { EmptyState, ErrorState } from "@/shared/components/feedback/ErrorState";
import { LoadingRows } from "@/shared/components/feedback/LoadingState";
import { Button } from "@/shared/components/ui/Button";
import { Card, CardHeader, CardTitle } from "@/shared/components/ui/Card";
import { SearchInput } from "@/shared/components/ui/SearchInput";
import type { RosterEntry } from "@/shared/types";
import { EditEmployeeModal } from "./components/EditEmployeeModal";
import { EmployeeTable } from "./components/EmployeeTable";
import { ExportExcelModal } from "./components/ExportExcelModal";
import { useEmployees } from "./hooks/useEmployees";
import type { UpdateEmployeeDto } from "./types";

export default function EmployeesPage() {
  const { roster, loading, error, refetch, updateEmployee, removeEmployee, saving } =
    useEmployees();
  const { departments } = useSettings();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [selectedDept, setSelectedDept] = useState("All");
  const [editingEmployee, setEditingEmployee] = useState<RosterEntry | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [actionError, setActionError] = useState<Error | null>(null);

  const depts = ["All", ...Array.from(new Set([...departments, ...roster.map((e) => e.dept)]))];

  const rows = roster.filter((e) => {
    const matchesDept = selectedDept === "All" || e.dept === selectedDept;
    const matchesQ = (e.name + e.id + e.dept + e.role)
      .toLowerCase()
      .includes(q.toLowerCase());
    return matchesDept && matchesQ;
  });

  const handleSaveEdit = async (patch: UpdateEmployeeDto) => {
    if (!editingEmployee) return;
    setActionError(null);
    try {
      await updateEmployee(editingEmployee.id, patch);
      setEditingEmployee(null);
    } catch (e) {
      setActionError(e instanceof Error ? e : new Error(String(e)));
    }
  };

  const handleDelete = async (employee: RosterEntry) => {
    const ok = window.confirm(
      `Delete ${employee.name} (${employee.id})?\n\nTheir salary structure and all saved payslips are removed too. This cannot be undone.`,
    );
    if (!ok) return;

    setActionError(null);
    try {
      await removeEmployee(employee.id);
    } catch (e) {
      setActionError(e instanceof Error ? e : new Error(String(e)));
    }
  };

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Employee Roster</CardTitle>
          <p className="mt-0.5 text-[12.5px] text-mist">
            Manage employee details, department assignments, and monthly payrolls ({roster.length} Total)
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <SearchInput
            value={q}
            onChange={setQ}
            placeholder="Search name, code, department…"
          />
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowExport(true)}
            disabled={loading || roster.length === 0}
            className="border border-line bg-paper text-ink hover:bg-slate-100"
          >
            <FileSpreadsheet size={14} className="text-emerald-600" /> Export Excel
          </Button>
          <Button size="sm" onClick={() => navigate("/employees/new")} disabled={loading}>
            <Plus size={14} /> Add employee
          </Button>
        </div>
      </CardHeader>

      {/* HR Department Filter Chips */}
      <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-line pb-3">
        <span className="text-[11.5px] font-bold text-ash uppercase tracking-wider flex items-center gap-1 mr-1">
          <Filter size={13} /> Dept:
        </span>
        {depts.map((d) => {
          const count = d === "All" ? roster.length : roster.filter((e) => e.dept === d).length;
          const active = selectedDept === d;
          return (
            <button
              key={d}
              onClick={() => setSelectedDept(d)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-semibold transition-all cursor-pointer border ${
                active
                  ? "bg-ink text-white border-ink shadow-sm"
                  : "bg-paper text-ash border-line hover:bg-slate-100 hover:text-ink"
              }`}
            >
              {d}
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10.5px] font-bold ${
                  active ? "bg-white/20 text-white" : "bg-line text-ash"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {actionError && (
        <div className="mb-4">
          <ErrorState title="Action Error" error={actionError} />
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
          onEdit={(e) => setEditingEmployee(e)}
          onDelete={handleDelete}
        />
      )}

      {editingEmployee && (
        <EditEmployeeModal
          employee={editingEmployee}
          saving={saving}
          onCancel={() => setEditingEmployee(null)}
          onSave={handleSaveEdit}
        />
      )}

      {showExport && (
        <ExportExcelModal
          roster={roster}
          onClose={() => setShowExport(false)}
        />
      )}
    </Card>
  );
}
