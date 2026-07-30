import { Plus } from "lucide-react";
import { ErrorState } from "@/shared/components/feedback/ErrorState";
import { LoadingRows } from "@/shared/components/feedback/LoadingState";
import { Button } from "@/shared/components/ui/Button";
import { Card, CardHeader, CardTitle } from "@/shared/components/ui/Card";
import { CatalogTable } from "./components/CatalogTable";
import { useCatalog } from "./hooks/useCatalog";

export default function ComponentsPage() {
  const { items, loading, error, refetch } = useCatalog();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Salary component catalog</CardTitle>
        <Button size="sm">
          <Plus size={14} /> New component
        </Button>
      </CardHeader>
      <p className="-mt-1.5 mb-4 text-[13px] leading-[1.5] text-ash">
        These are the building blocks HR assigns to any employee — add a new one
        here (e.g. “Other Incentive”) and it becomes available across all
        structures with no code change.
      </p>

      {loading ? (
        <LoadingRows rows={8} />
      ) : error ? (
        <ErrorState
          title="Could not load the catalog"
          error={error}
          onRetry={refetch}
        />
      ) : (
        <CatalogTable items={items} />
      )}
    </Card>
  );
}
