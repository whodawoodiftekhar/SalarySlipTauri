import { Plus } from "lucide-react";
import { useState } from "react";
import { ErrorState } from "@/shared/components/feedback/ErrorState";
import { LoadingRows } from "@/shared/components/feedback/LoadingState";
import { Button } from "@/shared/components/ui/Button";
import { Card, CardHeader, CardTitle } from "@/shared/components/ui/Card";
import type { CatalogItem } from "@/shared/types";
import { AddComponentModal } from "./components/AddComponentModal";
import { CatalogTable } from "./components/CatalogTable";
import { EditComponentModal } from "./components/EditComponentModal";
import { useCatalog } from "./hooks/useCatalog";

export default function ComponentsPage() {
  const { items, loading, error, refetch, addItem, updateItem, removeItem, saving } = useCatalog();
  const [adding, setAdding] = useState(false);
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);
  const [actionError, setActionError] = useState<Error | null>(null);

  const handleAdd = async (item: Parameters<typeof addItem>[0]) => {
    setActionError(null);
    try {
      await addItem(item);
      setAdding(false);
    } catch (e) {
      setActionError(e instanceof Error ? e : new Error(String(e)));
    }
  };

  const handleEditSave = async (code: string, patch: Partial<CatalogItem>) => {
    setActionError(null);
    try {
      await updateItem(code, patch);
      setEditingItem(null);
    } catch (e) {
      setActionError(e instanceof Error ? e : new Error(String(e)));
    }
  };

  const handleDelete = async (item: CatalogItem) => {
    const ok = window.confirm(
      `Delete component "${item.name}" (${item.code})?\n\nThis will remove it from the salary component catalog.`,
    );
    if (!ok) return;

    setActionError(null);
    try {
      await removeItem(item.code);
    } catch (e) {
      setActionError(e instanceof Error ? e : new Error(String(e)));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Salary component catalog</CardTitle>
        <Button size="sm" onClick={() => setAdding(true)} disabled={loading}>
          <Plus size={14} /> New component
        </Button>
      </CardHeader>
      <p className="-mt-1.5 mb-4 text-[13px] leading-[1.5] text-ash">
        These are the building blocks HR assigns to any employee — add a new one
        here (e.g. “Other Incentive”) and it becomes available across all
        structures with no code change.
      </p>

      {actionError && (
        <div className="mb-4">
          <ErrorState title="Component Action Error" error={actionError} />
        </div>
      )}

      {loading ? (
        <LoadingRows rows={8} />
      ) : error ? (
        <ErrorState
          title="Could not load the catalog"
          error={error}
          onRetry={refetch}
        />
      ) : (
        <CatalogTable
          items={items}
          busy={saving}
          onEdit={(item) => setEditingItem(item)}
          onDelete={handleDelete}
        />
      )}

      {adding && (
        <AddComponentModal
          saving={saving}
          onCancel={() => setAdding(false)}
          onSave={handleAdd}
        />
      )}

      {editingItem && (
        <EditComponentModal
          item={editingItem}
          saving={saving}
          onCancel={() => setEditingItem(null)}
          onSave={handleEditSave}
        />
      )}
    </Card>
  );
}
