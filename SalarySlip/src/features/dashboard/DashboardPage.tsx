import { Plus, Sparkles, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEmployees } from "@/features/employees/hooks/useEmployees";
import { useSettings } from "@/features/settings/hooks/useSettings";
import { ErrorState } from "@/shared/components/feedback/ErrorState";
import {
  LoadingRows,
  LoadingStats,
} from "@/shared/components/feedback/LoadingState";
import { Button } from "@/shared/components/ui/Button";
import { Card } from "@/shared/components/ui/Card";
import { DeptCostChart } from "./components/DeptCostChart";
import { RecentEmployees } from "./components/RecentEmployees";
import { StatRow } from "./components/StatRow";

export default function DashboardPage() {
  const { roster, loading, error, refetch } = useEmployees();
  const { company, currentUser } = useSettings();
  const navigate = useNavigate();

  if (loading) {
    return (
      <>
        <LoadingStats />
        <div className="grid grid-cols-[1.4fr_1fr] gap-4 max-wide:grid-cols-1">
          <Card>
            <LoadingRows rows={4} />
          </Card>
          <Card>
            <LoadingRows rows={5} />
          </Card>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <Card>
        <ErrorState
          title="Could not load the dashboard"
          error={error}
          onRetry={refetch}
        />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-ink via-slate-900 to-indigo-950 p-6 text-white shadow-md">
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[12px] font-semibold tracking-wider text-white/70 uppercase">
              <Sparkles size={14} className="text-amber-400" />
              {company.legalName} · Payroll Overview
            </div>
            <h1 className="mt-1 text-[22px] font-extrabold tracking-tight text-white">
              Welcome back, {currentUser.name} 👋
            </h1>
            <p className="mt-1 text-[13px] text-white/80">
              Here is your company's overall live salary summary and roster metrics.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="overlayGhost"
              className="bg-white/10 text-white hover:bg-white/20 border-white/20"
              onClick={() => navigate("/employees")}
            >
              <Users size={15} /> Roster ({roster.length})
            </Button>
            <Button
              className="bg-accent text-white hover:bg-accent/90"
              onClick={() => navigate("/employees/new")}
            >
              <Plus size={15} /> Add Employee
            </Button>
          </div>
        </div>
      </div>

      {/* 4 Key Executive Stat Cards */}
      <StatRow roster={roster} />

      {/* Department Chart + Recent Employees Grid */}
      <div className="grid grid-cols-[1.4fr_1fr] gap-5 max-wide:grid-cols-1">
        <DeptCostChart roster={roster} />
        <RecentEmployees roster={roster} />
      </div>
    </div>
  );
}
