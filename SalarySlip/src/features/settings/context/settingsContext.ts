import { createContext } from "react";
import type { AppSettings } from "@/shared/types";

export interface SettingsContextType extends AppSettings {
  refetchSettings: () => Promise<void>;
}

/** Only mounted once settings have loaded, so settings is never null here. */
export const SettingsContext = createContext<SettingsContextType | null>(null);

