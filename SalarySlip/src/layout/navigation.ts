import {
  LayoutDashboard,
  ReceiptText,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import type { NavItem } from "@/shared/types";

/**
 * Route configuration, not data — each entry binds a URL to a page component
 * and a React icon, so it cannot come from the database.
 */
export const NAV: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/" },
  { id: "employees", label: "Employees", icon: Users, path: "/employees" },
  { id: "payroll", label: "Run payroll", icon: ReceiptText, path: "/payroll" },
  {
    id: "components",
    label: "Components",
    icon: SlidersHorizontal,
    path: "/components",
  },
];

/** Which nav entry owns a given URL — "/" must match exactly. */
export const matchNav = (pathname: string): NavItem =>
  NAV.find((n) =>
    n.path === "/" ? pathname === "/" : pathname.startsWith(n.path),
  ) ?? NAV[0];
