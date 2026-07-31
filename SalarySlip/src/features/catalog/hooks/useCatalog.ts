import { useCallback, useState } from "react";
import { useAsync } from "@/shared/hooks/useAsync";
import type { CatalogItem } from "@/shared/types";
import { catalogService } from "../services/catalogService";

export function useCatalog() {
  const fetcher = useCallback(() => catalogService.list(), []);
  const { data, loading, error, refetch } = useAsync(fetcher);
  const [saving, setSaving] = useState(false);

  const addItem = async (item: CatalogItem) => {
    setSaving(true);
    try {
      const created = await catalogService.create(item);
      await refetch();
      return created;
    } finally {
      setSaving(false);
    }
  };

  const updateItem = async (code: string, patch: Partial<CatalogItem>) => {
    setSaving(true);
    try {
      const updated = await catalogService.update(code, patch);
      await refetch();
      return updated;
    } finally {
      setSaving(false);
    }
  };

  const removeItem = async (code: string) => {
    setSaving(true);
    try {
      await catalogService.remove(code);
      await refetch();
    } finally {
      setSaving(false);
    }
  };

  return { items: data ?? [], loading, error, refetch, addItem, updateItem, removeItem, saving };
}
