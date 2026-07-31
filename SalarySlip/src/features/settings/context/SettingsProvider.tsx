import { useCallback, useMemo, type ReactNode } from "react";
import { ErrorState } from "@/shared/components/feedback/ErrorState";
import { LoadingRows } from "@/shared/components/feedback/LoadingState";
import { Card } from "@/shared/components/ui/Card";
import { useAsync } from "@/shared/hooks/useAsync";
import { settingsService } from "../services/settingsService";
import { SettingsContext, type SettingsContextType } from "./settingsContext";

/**
 * Loads org configuration before anything else renders — the sidebar, topbar
 * and payslip all need the company name and pay period, so there is no useful
 * partial state to show.
 */
export function SettingsProvider({ children }: { children: ReactNode }) {
  const fetcher = useCallback(() => settingsService.get(), []);
  const { data, loading, error, refetch } = useAsync(fetcher);

  const value = useMemo<SettingsContextType | null>(() => {
    if (!data) return null;
    return {
      ...data,
      refetchSettings: async () => {
        await refetch();
      },
    };
  }, [data, refetch]);

  if (loading) {
    return (
      <div className="min-h-screen bg-paper p-7 font-sans text-[14px] text-ink">
        <Card className="mx-auto max-w-[560px]">
          <LoadingRows rows={3} />
        </Card>
      </div>
    );
  }

  if (error || !value) {
    return (
      <div className="min-h-screen bg-paper p-7 font-sans text-[14px] text-ink">
        <Card className="mx-auto max-w-[560px]">
          <ErrorState
            title="Cannot reach the payroll API"
            error={
              error ??
              new Error("The settings endpoint returned no data.")
            }
            onRetry={refetch}
          />
          <p className="mt-3 text-center text-[12.5px] leading-[1.6] text-ash">
            Start the backend server and make sure MongoDB is running on port 27017.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
  );
}

