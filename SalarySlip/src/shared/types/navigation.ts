import type { LucideIcon } from "lucide-react";

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  path: string;
  /** reachable by URL and titled like any page, but kept out of the sidebar */
  hidden?: boolean;
}
