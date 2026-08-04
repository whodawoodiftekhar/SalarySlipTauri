import { useState } from "react";
import { Play, Plus, RefreshCw, Sparkles, Users } from "lucide-react";
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
  const { company, currentUser, payPeriod } = useSettings();
  const navigate = useNavigate();
  const [startingBackend, setStartingBackend] = useState(false);
  const [backendStatusMsg, setBackendStatusMsg] = useState<string | null>(null);

  const handleStartBackend = async () => {
    setStartingBackend(true);
    setBackendStatusMsg(null);
    try {
      if (
        typeof window !== "undefined" &&
        ("__TAURI_INTERNALS__" in window || "__TAURI__" in window)
      ) {
        const core = await import("@tauri-apps/api/core");
        if (core && typeof core.invoke === "function") {
          const result = await core.invoke<string>("start_backend");
          setBackendStatusMsg(result);
        }
      } else {
        setBackendStatusMsg("Running in web browser mode.");
      }
      setTimeout(() => {
        refetch();
      }, 1200);
    } catch (err: unknown) {
      const msg =
        typeof err === "string"
          ? err
          : (err as Error)?.message || "Failed to start backend";
      setBackendStatusMsg(msg);
    } finally {
      setStartingBackend(false);
    }
  };

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
      <Card className="p-6">
        <ErrorState
          title="Could not load the dashboard"
          error={error}
          onRetry={refetch}
        />
        <div className="mt-4 flex flex-col items-center justify-center gap-2 border-t border-slate-100 pt-4">
          <p className="text-[13px] text-slate-500">
            If the backend server is not running, click below to launch it automatically:
          </p>
          <Button
            className="bg-indigo-600 text-white hover:bg-indigo-700"
            onClick={handleStartBackend}
            disabled={startingBackend}
          >
            {startingBackend ? (
              <RefreshCw size={15} className="animate-spin" />
            ) : (
              <Play size={15} />
            )}
            {startingBackend ? "Starting Backend..." : "Start Backend Package"}
          </Button>
          {backendStatusMsg && (
            <span className="text-[12px] font-medium text-emerald-600">
              {backendStatusMsg}
            </span>
          )}
        </div>
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
              variant="overlayGhost"
              className="border-white/20 bg-white/10 text-white hover:bg-white/20"
              onClick={() => navigate("/pay-run")}
              title={`Run payroll for ${payPeriod}`}
            >
              <Play size={15} /> Run {payPeriod}
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


