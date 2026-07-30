import { Navigate, useParams } from "react-router-dom";
import { useEmployees } from "@/features/employees/hooks/useEmployees";
import { useSettings } from "@/features/settings/hooks/useSettings";
import { ErrorState } from "@/shared/components/feedback/ErrorState";
import { LoadingRows } from "@/shared/components/feedback/LoadingState";
import { Card } from "@/shared/components/ui/Card";
import { PayrollEditor } from "./components/PayrollEditor";

export default function PayrollPage() {
  const { employeeId } = useParams<{ employeeId: string }>();
  const { employees, loading, error, refetch } = useEmployees();
  const { payPeriod } = useSettings();

  if (loading) {
    return (
      <Card>
        <LoadingRows rows={6} />
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <ErrorState
          title="Could not load this employee"
          error={error}
          onRetry={refetch}
        />
      </Card>
    );
  }

  const emp = employees.find((e) => e.id === employeeId);
  if (!emp) return <Navigate to="/employees" replace />;

  // keyed so switching employees resets the component editor cleanly
  return <PayrollEditor key={emp.id} emp={emp} period={payPeriod} />;
}
