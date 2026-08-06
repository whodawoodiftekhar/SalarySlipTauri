import {
  Building2,
  FileText,
  LayoutDashboard,
  PlayCircle,
  SlidersHorizontal,
  User,
  Users,
} from "lucide-react";
import type { NavItem } from "@/shared/types";

/**
 * Route configuration with vibrant executive icon styling for each item.
 */
export const NAV: NavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    path: "/",
    colorClass: "text-indigo-600",
    bgClass: "bg-indigo-50",
  },
  {
    id: "employees",
    label: "Employees",
    icon: Users,
    path: "/employees",
    colorClass: "text-emerald-600",
    bgClass: "bg-emerald-50",
  },
  {
    id: "payrun",
    label: "Pay Run",
    icon: PlayCircle,
    path: "/pay-run",
    colorClass: "text-violet-600",
    bgClass: "bg-violet-50",
  },
  // reached from "View in History" on the pay run, so it stays out of the sidebar
  {
    id: "payslips",
    label: "Payslips",
    icon: FileText,
    path: "/payslips",
    hidden: true,
    colorClass: "text-blue-600",
    bgClass: "bg-blue-50",
  },
  {
    id: "components",
    label: "Components",
    icon: SlidersHorizontal,
    path: "/components",
    colorClass: "text-amber-600",
    bgClass: "bg-amber-50",
  },
  {
    id: "settings",
    label: "Company Setup",
    icon: Building2,
    path: "/settings",
    colorClass: "text-sky-600",
    bgClass: "bg-sky-50",
  },
  {
    id: "profile",
    label: "Profile",
    icon: User,
    path: "/profile",
    colorClass: "text-rose-600",
    bgClass: "bg-rose-50",
  },
];

/** Which nav entry owns a given URL — "/" must match exactly. */
export const matchNav = (pathname: string): NavItem =>
  NAV.find((n) =>
    n.path === "/" ? pathname === "/" : pathname.startsWith(n.path),
  ) ?? NAV[0];
