import {
  Building2,
  FileText,
  LayoutDashboard,
  PlayCircle,
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
  { id: "payrun", label: "Pay Run", icon: PlayCircle, path: "/pay-run" },
  // reached from "View in History" on the pay run, so it stays out of the sidebar
  {
    id: "payslips",
    label: "Payslips",
    icon: FileText,
    path: "/payslips",
    hidden: true,
  },
  {
    id: "components",
    label: "Components",
    icon: SlidersHorizontal,
    path: "/components",
  },
  {
    id: "settings",
    label: "Company Setup",
    icon: Building2,
    path: "/settings",
  },
];


/** Which nav entry owns a given URL — "/" must match exactly. */
export const matchNav = (pathname: string): NavItem =>
  NAV.find((n) =>
    n.path === "/" ? pathname === "/" : pathname.startsWith(n.path),
  ) ?? NAV[0];
