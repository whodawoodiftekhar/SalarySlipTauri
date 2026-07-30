import { useEmployees } from "@/features/employees/hooks/useEmployees";
import { useSettings } from "@/features/settings/hooks/useSettings";
import { ErrorState } from "@/shared/components/feedback/ErrorState";
import {
  LoadingRows,
  LoadingStats,
} from "@/shared/components/feedback/LoadingState";
import { Card } from "@/shared/components/ui/Card";
import { DeptCostChart } from "./components/DeptCostChart";
import { RecentEmployees } from "./components/RecentEmployees";
import { StatRow } from "./components/StatRow";

export default function DashboardPage() {
  const { roster, loading, error, refetch } = useEmployees();
  const { payPeriod } = useSettings();

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
    <>
      <StatRow roster={roster} />
      <div className="grid grid-cols-[1.4fr_1fr] gap-4 max-wide:grid-cols-1">
        <DeptCostChart roster={roster} period={payPeriod} />
        <RecentEmployees roster={roster} />
      </div>
    </>
  );
}
