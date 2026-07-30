import { apiClient } from "@/services";
import type { AppSettings } from "@/shared/types";

export const settingsService = {
  async get(): Promise<AppSettings> {
    return apiClient.get<AppSettings>("/settings");
  },

  async update(patch: Partial<AppSettings>): Promise<AppSettings> {
    return apiClient.put<AppSettings>("/settings", patch);
  },
};
