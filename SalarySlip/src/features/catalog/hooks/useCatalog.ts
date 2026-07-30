import { useCallback } from "react";
import { useAsync } from "@/shared/hooks/useAsync";
import { catalogService } from "../services/catalogService";

export function useCatalog() {
  const fetcher = useCallback(() => catalogService.list(), []);
  const { data, loading, error, refetch } = useAsync(fetcher);
  return { items: data ?? [], loading, error, refetch };
}
