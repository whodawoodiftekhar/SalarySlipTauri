import { createContext } from "react";
import type { AppSettings } from "@/shared/types";

/** Only mounted once settings have loaded, so `settings` is never null here. */
export const SettingsContext = createContext<AppSettings | null>(null);
