import { apiClient } from "@/services";
import type { CatalogItem } from "@/shared/types";

export const catalogService = {
  async list(): Promise<CatalogItem[]> {
    return apiClient.get<CatalogItem[]>("/salary-components");
  },

  async create(item: CatalogItem): Promise<CatalogItem> {
    return apiClient.post<CatalogItem>("/salary-components", item);
  },

  async update(code: string, patch: Partial<CatalogItem>): Promise<CatalogItem> {
    return apiClient.put<CatalogItem>(`/salary-components/${code}`, patch);
  },

  async remove(code: string): Promise<void> {
    await apiClient.delete<{ deleted: boolean }>(`/salary-components/${code}`);
  },
};
